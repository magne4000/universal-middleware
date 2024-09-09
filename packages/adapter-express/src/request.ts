import { type DecoratedRequest, env, requestSymbol } from "./common.js";

// @ts-ignore
const deno = typeof Deno !== "undefined";
// @ts-ignore
const bun = typeof Bun !== "undefined";

/** Adapter options */
export interface NodeRequestAdapterOptions {
  /**
   * Set the origin part of the URL to a constant value.
   * It defaults to `process.env.ORIGIN`. If neither is set,
   * the origin is computed from the protocol and hostname.
   * To determine the protocol, `req.protocol` is tried first.
   * If `trustProxy` is set, `X-Forwarded-Proto` header is used.
   * Otherwise, `req.socket.encrypted` is used.
   * To determine the hostname, `X-Forwarded-Host`
   * (if `trustProxy` is set) or `Host` header is used.
   */
  origin?: string;
  /**
   * Whether to trust `X-Forwarded-*` headers. `X-Forwarded-Proto`
   * and `X-Forwarded-Host` are used to determine the origin when
   * `origin` and `process.env.ORIGIN` are not set. `X-Forwarded-For`
   * is used to determine the IP address. The leftmost values are used
   * if multiple values are set. Defaults to true if `process.env.TRUST_PROXY`
   * is set to `1`, otherwise false.
   */
  trustProxy?: boolean;
}

/** Create a function that converts a Node HTTP request into a fetch API `Request` object */
export function createRequestAdapter(options: NodeRequestAdapterOptions = {}): (req: DecoratedRequest) => Request {
  const { origin = env.ORIGIN, trustProxy = env.TRUST_PROXY === "1" } = options;

  // eslint-disable-next-line prefer-const
  let { protocol: protocolOverride, host: hostOverride } = origin ? new URL(origin) : ({} as Record<string, undefined>);

  if (protocolOverride) {
    protocolOverride = protocolOverride.slice(0, -1);
  }

  let warned = false;

  return function requestAdapter(req) {
    // Reuse already created request
    if (req[requestSymbol]) {
      return req[requestSymbol];
    }

    // TODO: Support the newer `Forwarded` standard header
    function parseForwardedHeader(name: string) {
      return (headers[`x-forwarded-${name}`] || "").split(",", 1)[0].trim();
    }

    let headers = req.headers as Record<string, string>;
    // Filter out pseudo-headers
    if (headers[":method"]) {
      headers = Object.fromEntries(Object.entries(headers).filter(([key]) => !key.startsWith(":")));
    }

    const protocol =
      protocolOverride ||
      req.protocol ||
      (trustProxy && parseForwardedHeader("proto")) ||
      (req.socket?.encrypted && "https") ||
      "http";

    let host = hostOverride || (trustProxy && parseForwardedHeader("host")) || headers.host;

    if (!host && !warned) {
      console.warn(
        "Could not automatically determine the origin host, using 'localhost'. " +
          "Use the 'origin' option or the 'ORIGIN' environment variable to set the origin explicitly.",
      );
      warned = true;
      host = "localhost";
    }

    const request = new Request(`${protocol}://${host}${req.originalUrl ?? req.url}`, {
      method: req.method,
      headers,
      body: convertBody(req),
      // @ts-ignore
      duplex: "half",
    });

    req[requestSymbol] = request;

    return request;
  };
}

function convertBody(req: DecoratedRequest): BodyInit | null | undefined {
  if (req.method === "GET" || req.method === "HEAD") {
    return;
  }

  // Needed for Google Cloud Functions and some other environments
  // that pre-parse the body.
  if (req.rawBody !== undefined) {
    return req.rawBody;
  }

  if (!bun && !deno) {
    // Real Node can handle ReadableStream
    return req as unknown as BodyInit;
  }

  return new ReadableStream({
    start(controller) {
      req.on("data", (chunk) => controller.enqueue(chunk));
      req.on("end", () => controller.close());
      req.on("error", (err) => controller.error(err));
    },
  });
}
