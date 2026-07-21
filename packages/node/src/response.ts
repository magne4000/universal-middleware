import type { IncomingMessage, ServerResponse } from "node:http";
import type { Readable } from "node:stream";
import type { ReadableStream as ReadableStreamNode } from "node:stream/web";
import { nodeHeadersToWeb } from "@universal-middleware/core";
import { forwardedValue, trustsProxy } from "./forwarded.js";
import type { PossiblyEncryptedSocket } from "./request.js";

/**
 * Send a fetch API Response into a Node.js HTTP response stream.
 */
export async function sendResponse(fetchResponse: Response, nodeResponse: ServerResponse): Promise<void> {
  const fetchBody: unknown = fetchResponse.body;

  let body: Readable | null = null;
  if (!fetchBody) {
    body = null;
  } else if (typeof (fetchBody as any).pipe === "function") {
    body = fetchBody as Readable;
  } else if (typeof (fetchBody as any).pipeTo === "function") {
    const { Readable } = await import("node:stream");
    if (Readable.fromWeb) {
      body = Readable.fromWeb(fetchBody as ReadableStreamNode);
    } else {
      const reader = (fetchBody as ReadableStream).getReader();
      body = new Readable({
        async read() {
          try {
            const { done, value } = await reader.read();
            if (done) {
              this.push(null);
            } else {
              const canContinue = this.push(value);
              if (!canContinue) {
                reader.releaseLock(); // Pause reading if backpressure occurs
              }
            }
          } catch (e) {
            this.destroy(e as Error);
          }
        },
        destroy(err, callback) {
          reader.cancel().finally(() => callback(err));
        },
      });
    }
  } else if (fetchBody) {
    const { Readable } = await import("node:stream");
    body = Readable.from(fetchBody as any);
  }

  setResponseHeaders(fetchResponse, nodeResponse);

  // Node discards a HEAD body at the wire, and an endless one (SSE, a proxied
  // stream) would keep the response from ever finishing. The headers still
  // describe what a GET would have sent.
  if (nodeResponse.req.method === "HEAD") {
    body?.destroy();
    nodeResponse.end();
    return;
  }

  if (body) {
    const { pipeline } = await import("node:stream/promises");
    await pipeline(body, nodeResponse).catch((error) => {
      if (!isClientGone(error)) console.error(error);
    });
  } else {
    nodeResponse.setHeader("content-length", "0");
    nodeResponse.end();
  }
}

// A client vanishing mid-response is routine; every other send failure is a real
// bug worth surfacing rather than swallowing.
function isClientGone(error: unknown): boolean {
  const code = (error as NodeJS.ErrnoException | undefined)?.code;
  return code === "ECONNRESET" || code === "EPIPE" || code === "ERR_STREAM_PREMATURE_CLOSE";
}

function getFullUrl(pathnameOrFull: string, req: IncomingMessage): string {
  try {
    return new URL(pathnameOrFull).href;
  } catch {
    // Without the opt-in, any client could set the header and point the redirect
    // at a host of its choosing.
    const trustProxy = trustsProxy();
    const protocol =
      (trustProxy && forwardedValue(req.headers, "proto")) ||
      ((req.socket as PossiblyEncryptedSocket | undefined)?.encrypted ? "https" : "http");
    const host = (trustProxy && forwardedValue(req.headers, "host")) || req.headers.host || "localhost";

    return new URL(pathnameOrFull, `${protocol}://${host}`).href;
  }
}

export function responseAdapter(nodeResponse: ServerResponse, bodyInit?: BodyInit | null): Response {
  // https://developer.mozilla.org/en-US/docs/Web/API/Response/redirect_static#status
  if ([301, 302, 303, 307, 308].includes(nodeResponse.statusCode) && nodeResponse.req) {
    const location = nodeResponse.getHeader("location") as string | undefined;
    if (location) {
      // Convert pathname to full URL
      const fullUrl = getFullUrl(location, nodeResponse.req as IncomingMessage);
      return Response.redirect(fullUrl, nodeResponse.statusCode);
    }
  }

  return new Response([204, 304].includes(nodeResponse.statusCode) ? null : bodyInit, {
    status: nodeResponse.statusCode,
    statusText: nodeResponse.statusMessage,
    headers: nodeHeadersToWeb(nodeResponse.getHeaders()),
  });
}

/**
 * Applies Web Response headers to a Node.js response.
 *
 * In mirror mode, the Web Response headers replace the Node.js response header snapshot.
 * Otherwise, Set-Cookie is appended to preserve existing Node.js cookies when sending a fresh response.
 */
export function setResponseHeaders(fetchResponse: Response, nodeResponse: ServerResponse, mirror = false) {
  nodeResponse.statusCode = fetchResponse.status;
  if (fetchResponse.statusText) {
    nodeResponse.statusMessage = fetchResponse.statusText;
  }

  const nodeResponseHeaders = new Set(Object.keys(nodeResponse.getHeaders()));

  const setCookie = fetchResponse.headers.getSetCookie();
  if (mirror) {
    // When omitted in mirror mode, existing Set-Cookie headers remain in nodeResponseHeaders
    // and are removed by the cleanup below.
    if (setCookie.length > 0) {
      nodeResponse.setHeader("set-cookie", setCookie);
      nodeResponseHeaders.delete("set-cookie");
    }
  } else {
    for (const cookie of setCookie) {
      nodeResponse.appendHeader("set-cookie", cookie);
    }
  }

  fetchResponse.headers.forEach((value, key) => {
    nodeResponseHeaders.delete(key);
    if (key === "set-cookie") return;
    nodeResponse.setHeader(key, value);
  });

  if (mirror) {
    // delete remaining node headers
    nodeResponseHeaders.forEach((key) => {
      nodeResponse.removeHeader(key);
    });
  }
}
