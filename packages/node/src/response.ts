import type { IncomingMessage, ServerResponse } from "node:http";
import type { Readable } from "node:stream";
import type { ReadableStream as ReadableStreamNode } from "node:stream/web";
import { nodeHeadersToWeb } from "@universal-middleware/core";

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

  if (body) {
    const { pipeline } = await import("node:stream/promises");
    await pipeline(body, nodeResponse).catch(() => {});
  } else {
    nodeResponse.setHeader("content-length", "0");
    nodeResponse.end();
  }
}

function getFullUrl(pathnameOrFull: string, req: IncomingMessage): string {
  try {
    return new URL(pathnameOrFull).href;
  } catch {
    const protocol = (req.socket as any)?.encrypted || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
    const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
    const baseUrl = `${protocol}://${host}`;

    return new URL(pathnameOrFull, baseUrl).href;
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

export function setResponseHeaders(fetchResponse: Response, nodeResponse: ServerResponse, mirror = false) {
  nodeResponse.statusCode = fetchResponse.status;
  if (fetchResponse.statusText) {
    nodeResponse.statusMessage = fetchResponse.statusText;
  }

  const nodeResponseHeaders = new Set(Object.keys(nodeResponse.getHeaders()));

  const setCookie = fetchResponse.headers.getSetCookie();
  for (const cookie of setCookie) {
    nodeResponse.appendHeader("set-cookie", cookie);
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
