import type { IncomingMessage, ServerResponse } from "node:http";
import type { Readable } from "node:stream";
import type { ReadableStream as ReadableStreamNode } from "node:stream/web";
import { nodeHeadersToWeb } from "@universal-middleware/core";
import { pendingMiddlewaresSymbol, wrappedResponseSymbol } from "./const.js";
import type { DecoratedServerResponse } from "./types.js";

/**
 * Send a fetch API Response into a Node.js HTTP response stream.
 */
export async function sendResponse(fetchResponse: Response, nodeResponse: DecoratedServerResponse): Promise<void> {
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

  setHeaders(fetchResponse, nodeResponse);

  if (body) {
    const { pipeline } = await import("node:stream/promises");
    await pipeline(body, nodeResponse).catch(() => {});
  } else {
    nodeResponse.setHeader("content-length", "0");
    nodeResponse.end();
  }
}

function createTransformStream() {
  const textEncoder = new TextEncoder();
  return new TransformStream<Uint8Array | string | Buffer, Uint8Array>({
    transform(chunk, ctrl) {
      if (typeof chunk === "string") {
        ctrl.enqueue(textEncoder.encode(chunk));
      } else if (chunk instanceof Uint8Array) {
        ctrl.enqueue(chunk);
      } else {
        ctrl.enqueue(new Uint8Array(chunk));
      }
    },
  });
}

function override<T extends DecoratedServerResponse>(
  nodeResponse: T,
  key: keyof T,
  forwardTo: WritableStreamDefaultWriter<Uint8Array | string | Buffer>,
) {
  const original: any = nodeResponse[key];

  (nodeResponse as any)[key] = (...args: any) => {
    // console.log("called", key, args);
    if (!nodeResponse.headersSent) {
      nodeResponse.writeHead(nodeResponse.statusCode);
    }
    if (args[0] && args[0].length > 0) {
      // console.log("write", args[0]);
      forwardTo.write(args[0]).catch(console.error);
    }
    if (key === "end") {
      // console.log("end");
      forwardTo.close().catch(() => {});
    }
    return true;
  };

  return {
    original(...args: any[]) {
      // console.log("original", key, args);
      original.apply(nodeResponse, args);
    },
    restore() {
      nodeResponse[key] = original;
    },
  };
}

function overrideWriteHead<T extends DecoratedServerResponse>(nodeResponse: T, callback: () => Promise<unknown>) {
  const original = nodeResponse.writeHead;
  let alreadyCalled = false;

  // Upon first call to `writeHead`, trigger pending middlewares
  // Upon further call while pending middlewares are still running, it should no-op
  nodeResponse.writeHead = () => {
    if (!alreadyCalled) {
      callback().catch(console.error);
      alreadyCalled = true;
    }

    return nodeResponse;
  };

  return {
    original(...args: any) {
      // console.log("original writeHead", args);
      original.apply(nodeResponse, args);
    },
    restore() {
      nodeResponse.writeHead = original;
    },
  };
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

export function responseAdapter(nodeResponse: DecoratedServerResponse, bodyInit?: BodyInit | null): Response {
  // https://developer.mozilla.org/en-US/docs/Web/API/Response/redirect_static#status
  if ([301, 302, 303, 307, 308].includes(nodeResponse.statusCode) && nodeResponse.req) {
    const location = nodeResponse.getHeader("location") as string | undefined;
    if (location) {
      // Convert pathname to full URL
      const fullUrl = getFullUrl(location, nodeResponse.req);
      return Response.redirect(fullUrl, nodeResponse.statusCode);
    }
  }

  return new Response([204, 304].includes(nodeResponse.statusCode) ? null : bodyInit, {
    status: nodeResponse.statusCode,
    statusText: nodeResponse.statusMessage,
    headers: nodeHeadersToWeb(nodeResponse.getHeaders()),
  });
}

export function wrapResponse(nodeResponse: DecoratedServerResponse, next?: (err?: unknown) => unknown) {
  if (nodeResponse[wrappedResponseSymbol]) return;
  nodeResponse[wrappedResponseSymbol] = true;

  const body = createTransformStream();
  const writer = body.writable.getWriter();
  const [reader1, reader2] = body.readable.tee();

  const original = {
    write: override(nodeResponse, "write", writer),
    end: override(nodeResponse, "end", writer),
    writeHead: overrideWriteHead(nodeResponse, triggerPendingMiddlewares),
  } as const;

  async function triggerPendingMiddlewares() {
    if (!nodeResponse[pendingMiddlewaresSymbol]) {
      return;
    }
    const middlewares = nodeResponse[pendingMiddlewaresSymbol];
    delete nodeResponse[pendingMiddlewaresSymbol];
    let response: Response | undefined;
    try {
      response = responseAdapter(nodeResponse, reader1);
      for (const middleware of middlewares) {
        const tmp = await middleware(response);
        // Do not hard-fail when encountering an undefined Response
        if (tmp) response = tmp;
      }
    } catch (e) {
      response = undefined;
      await writer.abort();
      original.writeHead.restore();
      original.write.restore();
      original.end.restore();
      if (next) {
        next(e);
      } else {
        throw e;
      }
    }

    if (!response) return;

    const readableToOriginal = response.body ?? reader2;

    setHeaders(response, nodeResponse, true);
    original.writeHead.restore();
    nodeResponse.flushHeaders();

    const wait = readableToOriginal.pipeTo(
      new WritableStream({
        write(chunk) {
          original.write.original(chunk);
        },
        close() {
          original.end.original();
        },
        abort() {
          original.end.original();
        },
      }),
    );

    await wait;
    original.write.restore();
    original.end.restore();
  }
}

function setHeaders(fetchResponse: Response, nodeResponse: ServerResponse, mirror = false) {
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
