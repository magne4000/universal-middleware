import { type IncomingMessage, type OutgoingHttpHeader, type OutgoingHttpHeaders, ServerResponse } from "node:http";
import { PassThrough, Readable } from "node:stream";
import type { RuntimeAdapterTarget } from "@universal-middleware/core";
import type { Express as Express5 } from "express";
import type { Express as Express4 } from "express4";

export type Express = Express4 | Express5;

const statusCodesWithoutBody = [
  100, // Continue
  101, // Switching Protocols
  102, // Processing (WebDAV)
  103, // Early Hints
  204, // No Content
  205, // Reset Content
  304, // Not Modified
];

export type ConnectMiddleware = (
  req: IncomingMessage,
  res: ServerResponse,
  next?: (err?: unknown) => void,
) => void | Promise<void>;
export type ConnectMiddlewareBoolean = (
  req: IncomingMessage,
  res: ServerResponse,
  next?: (err?: unknown) => void,
) => boolean | Promise<boolean>;
export type WebHandler<InContext extends Universal.Context = Universal.Context, Target = unknown> = (
  request: Request,
  context?: InContext,
  runtime?: RuntimeAdapterTarget<Target>,
) => Response | undefined | Promise<Response | undefined>;

/**
 * Converts a Connect-style middleware to a web-compatible request handler.
 * @beta
 */
export function connectToWeb(handler: ConnectMiddleware | ConnectMiddlewareBoolean): WebHandler {
  return async (request: Request, _context, runtime): Promise<Response | undefined> => {
    const realReq: IncomingMessage | undefined =
      // biome-ignore lint/suspicious/noExplicitAny: srvx request
      (runtime && "req" in runtime && runtime.req) || (request as any).runtime?.node?.req;
    const req = realReq ?? createIncomingMessage(request);
    const { res, onReadable } = createServerResponse(req);

    // A real server wires client disconnect to the request itself; a synthetic req/res does
    // not, so bridge the incoming abort to the handler while the response is in flight.
    const stopForwardingAbort = realReq ? undefined : forwardAbort(request.signal, req, res);

    // biome-ignore lint/suspicious/noAsyncPromiseExecutor: ignored
    return new Promise<Response | undefined>(async (resolve, reject) => {
      onReadable(({ readable, headers, statusCode }) => {
        const hasBody = !statusCodesWithoutBody.includes(statusCode);
        // Keep forwarding aborts until a streaming body has fully flushed, then stop.
        if (stopForwardingAbort) {
          if (hasBody) readable.once("close", stopForwardingAbort);
          else stopForwardingAbort();
        }
        resolve(
          new Response(hasBody ? toWebStream(readable) : null, {
            status: statusCode,
            headers: flattenHeaders(headers),
          }),
        );
      });

      const next = (error?: unknown) => {
        stopForwardingAbort?.();
        if (error) {
          reject(error instanceof Error ? error : new Error(String(error)));
        } else {
          resolve(undefined);
        }
      };

      try {
        const handled = await handler(req, res, next);

        if (handled === false) {
          res.destroy();
          stopForwardingAbort?.();
          resolve(undefined);
        }
      } catch (e) {
        next(e);
      }
    });
  };
}

/**
 * Creates an IncomingMessage object from a web Request.
 * @beta
 */
export function createIncomingMessage(request: Request): IncomingMessage {
  const url = new URL(request.url, "http://localhost");
  // biome-ignore lint/suspicious/noExplicitAny: Web/Node stream type clash
  const body = request.body ? Readable.fromWeb(request.body as any) : Readable.from([]);

  // Express reads connection metadata off `req.socket` (e.g. `req.protocol` -> `socket.encrypted`);
  // a synthetic request has no socket, so stub the field it reads to avoid a throw.
  return Object.assign(body, {
    url: url.pathname + url.search,
    method: request.method,
    headers: Object.fromEntries(request.headers),
    socket: { encrypted: url.protocol === "https:" },
  }) as unknown as IncomingMessage;
}

/**
 * Creates a custom ServerResponse object that allows for intercepting and streaming the response.
 *
 * @beta
 * @returns
 * An object containing:
 *   - res: The custom ServerResponse object.
 *   - onReadable: A function that takes a callback. The callback is invoked when the response is readable,
 *     providing an object with the readable stream, headers, and status code.
 */
export function createServerResponse(incomingMessage: IncomingMessage) {
  const res = new ServerResponse(incomingMessage);
  const passThrough = new PassThrough();
  let handled = false;

  const onReadable = (
    cb: (result: { readable: Readable; headers: OutgoingHttpHeaders; statusCode: number }) => void,
  ) => {
    const handleReadable = () => {
      if (handled) return;
      handled = true;
      cb({ readable: Readable.from(passThrough), headers: res.getHeaders(), statusCode: res.statusCode });
    };

    passThrough.once("readable", handleReadable);
    passThrough.once("end", handleReadable);
  };

  passThrough.once("finish", () => {
    res.emit("finish");
  });
  passThrough.once("close", () => {
    res.destroy();
    res.emit("close");
  });
  passThrough.on("drain", () => {
    res.emit("drain");
  });

  res.write = passThrough.write.bind(passThrough);
  // biome-ignore lint/suspicious/noExplicitAny: ignored
  res.end = passThrough.end.bind(passThrough) as any;

  res.writeHead = function writeHead(
    statusCode: number,
    statusMessage?: string | OutgoingHttpHeaders | OutgoingHttpHeader[],
    headers?: OutgoingHttpHeaders | OutgoingHttpHeader[],
  ): ServerResponse {
    res.statusCode = statusCode;
    if (typeof statusMessage === "object") {
      headers = statusMessage;
      statusMessage = undefined;
    }
    if (headers) {
      for (const [key, value] of Object.entries(headers)) {
        if (value !== undefined) {
          res.setHeader(key, value);
        }
      }
    }
    return res;
  };

  return {
    res,
    onReadable,
  };
}

/**
 * Bridges a web `AbortSignal` to a synthetic Node `req`/`res` and returns a stop function.
 *
 * `createRequestAdapter` derives the handler's `request.signal` from `res`'s "close" event,
 * which a socketless `ServerResponse` never emits on its own — so emit it explicitly.
 */
function forwardAbort(signal: AbortSignal, req: IncomingMessage, res: ServerResponse): () => void {
  let active = true;
  const abort = () => {
    if (!active) return;
    active = false;
    res.emit("close");
    req.destroy();
  };
  // An already-aborted signal must wait for the handler to register its "close" listener,
  // which it does synchronously once invoked.
  if (signal.aborted) queueMicrotask(abort);
  else signal.addEventListener("abort", abort, { once: true });
  return () => {
    active = false;
    signal.removeEventListener("abort", abort);
  };
}

function toWebStream(readable: Readable): ReadableStream {
  // `ReadableStream.from` is unavailable on some runtimes/older Node versions.
  return "from" in ReadableStream
    ? // biome-ignore lint/suspicious/noExplicitAny: Web/Node stream type clash
      (ReadableStream as any).from(readable)
    : // biome-ignore lint/suspicious/noExplicitAny: Web/Node stream type clash
      (Readable.toWeb(readable) as any);
}

function flattenHeaders(headers: OutgoingHttpHeaders): [string, string][] {
  const flatHeaders: [string, string][] = [];

  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined || value === null) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const v of value) {
        if (v != null) {
          flatHeaders.push([key, String(v)]);
        }
      }
    } else {
      flatHeaders.push([key, String(value)]);
    }
  }

  return flatHeaders;
}

// https://expressjs.com/en/guide/migrating-5.html#app.del
export function isExpressV4(app: Express): app is Express4 {
  return "del" in app;
}

export function isExpressV5(app: Express): app is Express5 {
  return !isExpressV4(app);
}
