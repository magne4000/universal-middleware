import type { ServerResponse } from "node:http";
import type { Readable } from "node:stream";
import type { ReadableStream as ReadableStreamNode } from "node:stream/web";
import { nodeHeadersToWeb } from "@universal-middleware/core";
import { originSymbol } from "./const.js";
import { forwardedValue, trustsProxy } from "./forwarded.js";
import type { DecoratedRequest } from "./request.js";

const NOT_READY = Symbol("not ready");
// A body in memory is read at once and sent with its length. An endless stream may always be ready: after this many
// reads, the body is streamed.
const MAX_READS_AT_ONCE = 4;

/** Send a fetch API Response into a Node.js HTTP response stream */
export async function sendResponse(fetchResponse: Response, nodeResponse: ServerResponse): Promise<void> {
  // Another Response implementation may give a Node stream or an iterable
  const body: unknown = fetchResponse.body;
  setResponseHeaders(fetchResponse, nodeResponse);

  if (body instanceof ReadableStream) return sendWebStream(body, nodeResponse);
  if (body) return sendNodeStream(body, nodeResponse);
  // HEAD keeps the GET's headers. A 204 has no content; a 304's length is the 200's (RFC 9110 §8.6).
  if (nodeResponse.req?.method !== "HEAD" && fetchResponse.status !== 204 && fetchResponse.status !== 304) {
    nodeResponse.setHeader("content-length", "0");
  }
  nodeResponse.end();
}

async function sendWebStream(body: ReadableStream<Uint8Array | string>, nodeResponse: ServerResponse): Promise<void> {
  // Node discards a HEAD body, and an endless one (SSE, a proxied stream) would keep the response open.
  // A client gone before the Response was ready doesn't get it either.
  const head = nodeResponse.req?.method === "HEAD";
  if (head || nodeResponse.destroyed) {
    body.cancel().catch(console.error);
    if (head) nodeResponse.end();
    return;
  }

  const reader = body.getReader();
  // An endless body is cancelled when the client leaves, rather than read on
  const onClose = () => {
    reader.cancel().catch(() => {});
  };
  nodeResponse.once("close", onClose);
  try {
    // A body in memory (a string, a buffer, JSON) goes out in one write, with its Content-Length
    const chunks: Uint8Array[] = [];
    let read = reader.read();
    while (chunks.length < MAX_READS_AT_ONCE) {
      const result = await Promise.race([read, Promise.resolve().then((): typeof NOT_READY => NOT_READY)]);
      if (result === NOT_READY) break;
      if (result.done) {
        const bytes = chunks.length === 1 ? chunks[0] : Buffer.concat(chunks);
        if (!nodeResponse.hasHeader("content-length") && !nodeResponse.hasHeader("transfer-encoding")) {
          nodeResponse.setHeader("content-length", bytes.byteLength);
        }
        nodeResponse.end(bytes);
        return;
      }
      // A stream of strings isn't a valid body, but Node sends it
      chunks.push(typeof result.value === "string" ? Buffer.from(result.value) : result.value);
      read = reader.read();
    }

    // Anything else is streamed as fast as the client reads it
    for (const chunk of chunks) nodeResponse.write(chunk);
    for (let result = await read; !result.done; result = await reader.read()) {
      if (nodeResponse.destroyed) {
        reader.cancel().catch(() => {});
        return;
      }
      const chunk = typeof result.value === "string" ? Buffer.from(result.value) : result.value;
      if (!nodeResponse.write(chunk)) {
        // Until the socket drains, or the client leaves
        await new Promise<void>((resolve) => {
          const done = () => {
            nodeResponse.off("drain", done);
            nodeResponse.off("close", done);
            resolve();
          };
          nodeResponse.on("drain", done);
          nodeResponse.on("close", done);
        });
      }
    }
    nodeResponse.end();
  } catch (error) {
    // Cut the response short, so that the client doesn't take it for complete
    if (!isClientGone(error)) console.error(error);
    nodeResponse.destroy();
  } finally {
    nodeResponse.off("close", onClose);
  }
}

async function sendNodeStream(body: object, nodeResponse: ServerResponse): Promise<void> {
  // Imported when needed: the main entry re-exports this module, and must load where `node:stream` doesn't exist
  const { Readable } = await import("node:stream");
  const readable: Readable =
    typeof (body as any).pipe === "function"
      ? (body as Readable)
      : typeof (body as any).pipeTo === "function"
        ? // A Web stream of another realm
          Readable.fromWeb(body as ReadableStreamNode)
        : Readable.from(body as any);

  if (nodeResponse.req?.method === "HEAD") {
    readable.destroy();
    nodeResponse.end();
    return;
  }
  // The client left before the Response was ready: `pipeline` would throw without destroying the body.
  // A failing cleanup would otherwise be an unhandled `error` event.
  if (nodeResponse.destroyed) {
    readable.on("error", console.error);
    readable.destroy();
    return;
  }
  const { pipeline } = await import("node:stream/promises");
  await pipeline(readable, nodeResponse).catch((error) => {
    if (!isClientGone(error)) console.error(error);
  });
}

// A client leaving mid-response is routine; any other send failure is a bug worth logging
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
    // The request URL's origin, whatever set it: the `origin` option, the forwarding headers or the framework.
    if (req[originSymbol]) return new URL(pathnameOrFull, req[originSymbol]).href;
    // No `Request` was made. Any client can set the forwarding headers, so only `TRUST_PROXY` makes them count.
    const trustProxy = trustsProxy();
    const protocol =
      (trustProxy && forwardedValue(req.headers, "proto")) ||
      req.protocol ||
      (req.socket?.encrypted ? "https" : "http");
    // HTTP/2 clients send the host as `:authority`
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
 * In mirror mode, they replace the Node.js response's. Otherwise, Set-Cookie is appended to the Node.js response's.
 */
export function setResponseHeaders(fetchResponse: Response, nodeResponse: ServerResponse, mirror = false) {
  nodeResponse.statusCode = fetchResponse.status;
  if (fetchResponse.statusText) {
    nodeResponse.statusMessage = fetchResponse.statusText;
  }

  const setCookie = fetchResponse.headers.getSetCookie();
  if (mirror) {
    // Only the Web Response's headers are kept
    for (const name of nodeResponse.getHeaderNames()) {
      if (!fetchResponse.headers.has(name)) nodeResponse.removeHeader(name);
    }
    if (setCookie.length > 0) nodeResponse.setHeader("set-cookie", setCookie);
  } else {
    for (const cookie of setCookie) {
      nodeResponse.appendHeader("set-cookie", cookie);
    }
  }

  fetchResponse.headers.forEach((value, key) => {
    if (key !== "set-cookie") nodeResponse.setHeader(key, value);
  });
}
