import type { IncomingMessage, ServerResponse } from "node:http";
import type { Socket } from "node:net";
import type { contextSymbol } from "@universal-middleware/core";
import { env, originSymbol, requestSymbol } from "./const.js";
import { forwardedValue, trustsProxy } from "./forwarded.js";

export { env, requestSymbol };

// @ts-expect-error Deno
const deno = typeof Deno !== "undefined";
const bun = typeof Bun !== "undefined";

export interface PossiblyEncryptedSocket extends Socket {
  encrypted?: boolean;
}

/** `IncomingMessage`, with the fields Express and body parsers may add */
export interface DecoratedRequest<C extends Universal.Context = Universal.Context>
  extends Omit<IncomingMessage, "socket"> {
  ip?: string;
  protocol?: string;
  socket?: PossiblyEncryptedSocket;
  // biome-ignore lint/suspicious/noExplicitAny: we only care about the field being present
  rawBody?: any;
  /** Set by a body parser (e.g. `express.json()`) that already consumed the stream */
  // biome-ignore lint/suspicious/noExplicitAny: whatever the parser produced
  body?: any;
  originalUrl?: string;
  params?: Record<string, string>;
  [contextSymbol]?: C;
  [requestSymbol]?: Request;
  /** The request URL's origin, which relative redirects resolve against */
  [originSymbol]?: string;
}

/** The protocol and host the server framework resolved for a request, e.g. from its own trust-proxy setting */
export interface RequestOrigin {
  protocol?: string;
  host?: string;
}

export interface NodeRequestAdapterOptions {
  /**
   * A constant origin for the URL. Defaults to `process.env.ORIGIN`. Otherwise the protocol and host come, in order,
   * from the forwarding headers (with `trustProxy`), the framework's `RequestOrigin`, then `req.protocol` or the socket
   * for the protocol, and the target, `:authority` or `Host` for the host.
   */
  origin?: string;
  /**
   * Trust `X-Forwarded-Proto` and `X-Forwarded-Host`, completed by RFC 7239's `Forwarded`. The first entry is used,
   * as Express does. Defaults to `process.env.TRUST_PROXY === "1"`.
   */
  trustProxy?: boolean;
}

/** The request has no URL a `Request` can hold, e.g. a malformed `Host`. Express and Fastify answer it with a 400. */
export class BadRequestError extends Error {
  override name = "BadRequestError";
  readonly status = 400;
  readonly statusCode = 400;
}

// An RFC 3986 host and port: anything else would land in the URL's userinfo, path, query or fragment (`Host: x/admin?`)
const VALID_HOST = /^(?:\[[\da-f:.]+\]|[\w!$&'()*+,;=~.-]+)(?::\d*)?$/i;
const VALID_SCHEME = /^[a-z][a-z\d+.-]*$/i;

const signalSymbol = Symbol("universal-middleware.signal");
type SignalledResponse = ServerResponse & { [signalSymbol]?: AbortSignal };

/** Create a function that converts a Node HTTP request into a fetch API `Request` object */
export function createRequestAdapter(
  options: NodeRequestAdapterOptions = {},
): (req: DecoratedRequest, res: ServerResponse, resolved?: RequestOrigin) => Request {
  const { origin = env.ORIGIN, trustProxy = trustsProxy() } = options;

  let { protocol: protocolOverride, host: hostOverride } = origin ? new URL(origin) : ({} as Record<string, undefined>);

  if (protocolOverride) {
    protocolOverride = protocolOverride.slice(0, -1);
  }

  let warned = false;

  return function requestAdapter(req, res: SignalledResponse, resolved) {
    if (req[requestSymbol]) {
      return req[requestSymbol];
    }

    let headers = req.headers as Record<string, string>;
    // HTTP/2 clients send the host as the `:authority` pseudo-header, which wins over a Host header (RFC 9113 §8.3.1)
    const authority = headers[":authority"];
    if (headers[":method"]) {
      headers = Object.fromEntries(Object.entries(headers).filter(([key]) => !key.startsWith(":")));
    }

    const protocol =
      protocolOverride ||
      (trustProxy && forwardedValue(headers, "proto")) ||
      resolved?.protocol ||
      req.protocol ||
      // biome-ignore lint/suspicious/noExplicitAny: encrypted can exist in some express versions
      ((req.socket as any)?.encrypted && "https") ||
      "http";

    let target = req.originalUrl ?? req.url ?? "/";
    let targetHost: string | undefined;
    if (!target.startsWith("/")) {
      // RFC 9112 §3.2.2: an absolute-form target carries the host. `OPTIONS *` has no URL a `Request` can hold.
      if (!/^https?:\/\//i.test(target) || !URL.canParse(target)) {
        throw new BadRequestError(`Unsupported request target: ${target}`);
      }
      const absolute = new URL(target);
      targetHost = absolute.host;
      target = absolute.pathname + absolute.search;
    }

    let host =
      hostOverride ||
      (trustProxy && forwardedValue(headers, "host")) ||
      resolved?.host ||
      targetHost ||
      authority ||
      headers.host;

    if (!host) {
      if (!warned) {
        console.warn(
          "Could not automatically determine the origin host, using 'localhost'. " +
            "Use the 'origin' option or the 'ORIGIN' environment variable to set the origin explicitly.",
        );
        warned = true;
      }
      host = "localhost";
    }

    // The parsed body is re-serialized: the original framing headers no longer apply
    if (hasParsedBody(req)) {
      headers = { ...headers };
      delete headers["content-length"];
      delete headers["content-encoding"];
    }

    if (!VALID_SCHEME.test(protocol) || !VALID_HOST.test(host)) {
      throw new BadRequestError(`Invalid request origin: ${protocol}://${host}`);
    }
    const url = `${protocol}://${host}${target}`;
    // A port or an IP address out of range passes the checks above
    if (!URL.canParse(url)) {
      throw new BadRequestError(`Invalid request URL: ${url}`);
    }

    // One signal per response, shared by the `Request`s made again once a body was handed back
    let signal = res[signalSymbol];
    if (!signal) {
      const abortController = new AbortController();
      res.once("close", () => {
        if (!res.writableEnded) abortController.abort();
      });
      signal = res[signalSymbol] = abortController.signal;
    }

    const request = new Request(url, {
      method: req.method,
      headers,
      body: convertBody(req),
      signal,
      // @ts-expect-error
      duplex: "half",
    });

    req[requestSymbol] = request;
    req[originSymbol] = `${protocol}://${host}`;

    return request;
  };
}

function hasParsedBody(req: DecoratedRequest) {
  return req.rawBody === undefined && (req.readableDidRead || req.readableEnded) && req.body !== undefined;
}

function convertBody(req: DecoratedRequest): BodyInit | null | undefined {
  if (req.method === "GET" || req.method === "HEAD") {
    return;
  }

  // Set by environments that pre-parse the body (Google Cloud Functions)
  if (req.rawBody !== undefined) {
    return req.rawBody;
  }

  // A body parser already consumed the stream
  if (hasParsedBody(req)) {
    return parsedBody(req);
  }

  if (!bun && !deno) {
    // undici takes a Node `Readable` as body, with backpressure
    return req as unknown as BodyInit;
  }

  // Bun and Deno need a Web stream: the source pauses when the queue is full, and resumes on `pull`
  return new ReadableStream({
    start(controller) {
      req.on("data", (chunk) => {
        controller.enqueue(chunk);
        if ((controller.desiredSize ?? 1) <= 0) req.pause();
      });
      req.on("end", () => controller.close());
      req.on("error", (err) => controller.error(err));
    },
    pull() {
      req.resume();
    },
    cancel(reason) {
      req.destroy(reason instanceof Error ? reason : undefined);
    },
  });
}

/** Rebuilds the body a parser left on `req.body`. It is only serialized once the request body is read. */
function parsedBody(req: DecoratedRequest): ReadableStream<Uint8Array> {
  return new ReadableStream(
    {
      pull(controller) {
        const bytes = serializeParsedBody(req);
        if (bytes) controller.enqueue(bytes);
        controller.close();
      },
    },
    { highWaterMark: 0 },
  );
}

/** The bytes of the parsed body, or undefined when it can't be rebuilt faithfully (then the request has no body). */
function serializeParsedBody(req: DecoratedRequest): Uint8Array | undefined {
  const { body, headers } = req;
  // Parsers set `{}` for a request without a body: only HTTP/1's framing headers tell (HTTP/2 may omit them)
  if (
    req.httpVersionMajor < 2 &&
    headers["transfer-encoding"] === undefined &&
    (headers["content-length"] ?? "0") === "0"
  )
    return;
  if (body instanceof Uint8Array) return body;

  const contentType = String(headers["content-type"]).split(";")[0].trim().toLowerCase();
  const encoder = new TextEncoder();
  if (contentType === "application/json" || contentType.endsWith("+json")) {
    // A string under a JSON type is taken as a JSON string ("x"), not as raw JSON text from a text parser
    return encoder.encode(JSON.stringify(body));
  }
  if (typeof body === "string") return encoder.encode(body);
  if (contentType === "application/x-www-form-urlencoded" && body && typeof body === "object") {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(body)) {
      // `a[]=1` parses to `["1"]` and would be rebuilt as `a=1`, which parses back to a string
      if (Array.isArray(value) && value.length === 1) return;
      for (const item of Array.isArray(value) ? value : [value]) {
        if (typeof item !== "string") return;
        params.append(key, item);
      }
    }
    return encoder.encode(params.toString());
  }
}
