import { EventEmitter } from "node:events";
import { type IncomingMessage, type OutgoingHttpHeader, type OutgoingHttpHeaders, ServerResponse } from "node:http";
import { PassThrough, Readable } from "node:stream";
import { contextSymbol, type RuntimeAdapterTarget } from "@universal-middleware/core";
import { setHead } from "./head.js";
import type { DecoratedRequest, DecoratedServerResponse } from "./types.js";

type ExpressRequestHandler = (
  req: DecoratedRequest,
  res: DecoratedServerResponse,
  next: (err?: unknown) => void,
) => unknown;

/**
 * The parts of an Express 4 or 5 application the adapter uses.
 * Declared here so that the published types do not depend on a given `express` or `@types/express` version.
 */
export interface Express {
  (req: IncomingMessage, res: ServerResponse): void;
  use(...handlers: ExpressRequestHandler[]): unknown;
  all(path: string, ...handlers: ExpressRequestHandler[]): unknown;
}

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
  return async (request: Request, context, runtime): Promise<Response | undefined> => {
    const realReq: IncomingMessage | undefined =
      // biome-ignore lint/suspicious/noExplicitAny: srvx request
      (runtime && "req" in runtime && runtime.req) || (request as any).runtime?.node?.req;
    const req = realReq ?? createIncomingMessage(request);
    // The app's routes read the caller's context with `getContext(req)` (srvx keeps it on the request). Set, not
    // defaulted: a Node request can pass through several apps, each with its own caller.
    // biome-ignore lint/suspicious/noExplicitAny: srvx request
    const callerContext = context ?? (request as any).context;
    // biome-ignore lint/suspicious/noExplicitAny: decorated req
    if (callerContext) (req as any)[contextSymbol] = callerContext;
    const { res, onReadable } = createServerResponse(req);

    // A synthetic req/res isn't wired to the client: the incoming abort is bridged while the response is in flight
    const stopForwardingAbort = realReq ? undefined : forwardAbort(request.signal, req, res);

    // biome-ignore lint/suspicious/noAsyncPromiseExecutor: ignored
    return new Promise<Response | undefined>(async (resolve, reject) => {
      onReadable(({ readable, headers, statusCode, statusMessage }) => {
        const hasBody = !statusCodesWithoutBody.includes(statusCode);
        // Until a streaming body has flushed
        if (stopForwardingAbort) {
          if (hasBody) readable.once("close", stopForwardingAbort);
          else stopForwardingAbort();
        }
        resolve(
          new Response(hasBody ? toWebStream(readable) : null, {
            status: statusCode,
            statusText: statusMessage,
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

  // A Web Request has its host in the URL: the app gets a Host header, as Node gives it
  const headers: Record<string, string> = { host: url.host, ...Object.fromEntries(request.headers) };
  // Without `content-length` or `transfer-encoding`, body parsers (`type-is.hasBody()`) would skip the body
  if (request.body && headers["content-length"] === undefined) {
    headers["transfer-encoding"] = "chunked";
  }

  // Express reads `req.socket` (e.g. `socket.encrypted` for `req.protocol`), which a synthetic request lacks
  const message = Object.assign(body, {
    url: url.pathname + url.search,
    method: request.method,
    headers,
    rawHeaders: Object.entries(headers).flat(),
    // Loggers read it (morgan's `:http-version`)
    httpVersion: "1.1",
    httpVersionMajor: 1,
    httpVersionMinor: 1,
    complete: !request.body,
    // An EventEmitter: `on-finished` (used by body parsers) listens to it. `readable` too: a socket that isn't
    // readable reads as finished, and the body is skipped.
    socket: Object.assign(new EventEmitter(), { encrypted: url.protocol === "https:", readable: true }),
  }) as unknown as IncomingMessage;

  message.once("end", () => {
    message.complete = true;
  });

  return message;
}

/**
 * Creates a `ServerResponse` whose output is captured. `onReadable`'s callback gets the output stream, the headers and
 * the status once the response starts.
 * @beta
 */
export function createServerResponse(incomingMessage: IncomingMessage) {
  const res = new ServerResponse(incomingMessage);
  const passThrough = new PassThrough();
  let handled = false;

  const onReadable = (
    cb: (result: {
      readable: Readable;
      headers: OutgoingHttpHeaders;
      statusCode: number;
      statusMessage: string | undefined;
    }) => void,
  ) => {
    const handleReadable = () => {
      if (handled) return;
      handled = true;
      cb({
        readable: Readable.from(passThrough),
        headers: res.getHeaders(),
        statusCode: res.statusCode,
        statusMessage: res.statusMessage,
      });
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
  // biome-ignore lint/suspicious/noExplicitAny: `end`'s overloads differ from the PassThrough's
  res.end = passThrough.end.bind(passThrough) as any;

  res.writeHead = function writeHead(
    statusCode: number,
    statusMessage?: string | OutgoingHttpHeaders | OutgoingHttpHeader[],
    headers?: OutgoingHttpHeaders | OutgoingHttpHeader[],
  ): ServerResponse {
    setHead(res, statusCode, statusMessage, headers);
    return res;
  };

  return {
    res,
    onReadable,
  };
}

/**
 * Bridges a Web `AbortSignal` to a synthetic `req`/`res`, and returns a function that stops it.
 * The request adapter aborts `request.signal` on `res`'s "close", which a socketless `ServerResponse` never emits.
 */
function forwardAbort(signal: AbortSignal, req: IncomingMessage, res: ServerResponse): () => void {
  let active = true;
  const abort = () => {
    if (!active) return;
    active = false;
    res.emit("close");
    req.destroy();
  };
  // An already-aborted signal waits for the handler to listen to "close", which it does synchronously
  if (signal.aborted) queueMicrotask(abort);
  else signal.addEventListener("abort", abort, { once: true });
  return () => {
    active = false;
    signal.removeEventListener("abort", abort);
  };
}

function toWebStream(readable: Readable): ReadableStream {
  // `ReadableStream.from` is missing from some runtimes
  return "from" in ReadableStream
    ? // biome-ignore lint/suspicious/noExplicitAny: Web/Node stream type clash
      (ReadableStream as any).from(readable)
    : // biome-ignore lint/suspicious/noExplicitAny: Web/Node stream type clash
      (Readable.toWeb(readable) as any);
}

/** Connection-specific headers: they describe one transport hop, not the message (RFC 9110 §7.6.1). */
const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

function flattenHeaders(headers: OutgoingHttpHeaders): [string, string][] {
  const flatHeaders: [string, string][] = [];
  // The captured body isn't chunk-framed: a copied `Transfer-Encoding` would misframe it. The names in `Connection`
  // are hop-by-hop too.
  const connectionTokens = String(headers.connection ?? "").split(",");
  const dropped = new Set([...HOP_BY_HOP_HEADERS, ...connectionTokens.map((name) => name.trim().toLowerCase())]);

  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined || value === null) {
      continue;
    }

    if (dropped.has(key.toLowerCase())) {
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
