import type { ServerResponse } from "node:http";
import type { Readable } from "node:stream";
import type { ReadableStream as ReadableStreamNode } from "node:stream/web";
import { nodeHeadersToWeb } from "@universal-middleware/core";
import { originSymbol } from "./const.js";
import { forwardedValue, trustsProxy } from "./forwarded.js";
import type { DecoratedRequest } from "./request.js";

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
  if (nodeResponse.req?.method === "HEAD") {
    body?.destroy();
    nodeResponse.end();
    return;
  }

  if (body) {
    const { pipeline } = await import("node:stream/promises");
    // The client left before the Response was ready: `pipeline` would throw
    // without destroying `body`, leaving a Web stream uncancelled.
    if (nodeResponse.destroyed) {
      // A failing cleanup would otherwise be an unhandled `error` event.
      body.on("error", console.error);
      body.destroy();
      return;
    }
    await pipeline(body, nodeResponse).catch((error) => {
      if (!isClientGone(error)) console.error(error);
    });
  } else {
    // A 204 has no content to measure, and a 304's Content-Length describes the 200 response (RFC 9110 §8.6)
    if (fetchResponse.status !== 204 && fetchResponse.status !== 304) nodeResponse.setHeader("content-length", "0");
    nodeResponse.end();
  }
}

// A client vanishing mid-response is routine; every other send failure is a real
// bug worth surfacing rather than swallowing.
const CLIENT_GONE_CODES = new Set([
  "ECONNRESET",
  "EPIPE",
  "ERR_STREAM_PREMATURE_CLOSE",
  "ERR_STREAM_DESTROYED",
  "ABORT_ERR",
]);
function isClientGone(error: unknown): boolean {
  return CLIENT_GONE_CODES.has((error as NodeJS.ErrnoException | undefined)?.code ?? "");
}

function getFullUrl(pathnameOrFull: string, req: DecoratedRequest): string {
  try {
    return new URL(pathnameOrFull).href;
  } catch {
    // The origin of the request URL, so that a redirect stays on it, whatever set it: the `origin` option,
    // the forwarding headers, or the framework's trust-proxy setting.
    if (req[originSymbol]) return new URL(pathnameOrFull, req[originSymbol]).href;
    // No `Request` was made for this request. Without the opt-in, any client could set the header and
    // point the redirect at a host of its choosing, so only the `TRUST_PROXY` env var enables it.
    const trustProxy = trustsProxy();
    // Same order as `createRequestAdapter`: Express's `req.protocol` follows its own `trust proxy` setting
    const protocol =
      (trustProxy && forwardedValue(req.headers, "proto")) ||
      req.protocol ||
      (req.socket?.encrypted ? "https" : "http");
    // HTTP/2 clients send the host as `:authority`, as `createRequestAdapter` reads it
    const host =
      (trustProxy && forwardedValue(req.headers, "host")) ||
      req.headers[":authority"] ||
      req.headers.host ||
      "localhost";

    return new URL(pathnameOrFull, `${protocol}://${host}`).href;
  }
}

export function responseAdapter(nodeResponse: ServerResponse, bodyInit?: BodyInit | null): Response {
  const headers = nodeHeadersToWeb(nodeResponse.getHeaders());
  // Not Response.redirect(): its headers are immutable and keep only Location
  if ([301, 302, 303, 307, 308].includes(nodeResponse.statusCode) && nodeResponse.req) {
    const location = headers.get("location");
    if (location) {
      // Convert pathname to full URL
      headers.set("location", getFullUrl(location, nodeResponse.req));
    }
  }

  return new Response([204, 304].includes(nodeResponse.statusCode) ? null : bodyInit, {
    status: nodeResponse.statusCode,
    statusText: nodeResponse.statusMessage,
    headers,
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
