import type { OutgoingHttpHeaders } from "node:http";
import {
  keepBodySymbol,
  optionsToSymbols,
  orderSymbol,
  pathSymbol,
  unboundSymbol,
  universalSymbol,
  urlSymbol,
} from "./const";
import type {
  AnyFn,
  EnhancedMiddleware,
  SetThis,
  UniversalFn,
  UniversalHandler,
  UniversalMiddleware,
  UniversalOptions,
  UniversalOptionsArg,
  UniversalSymbols,
  WithUniversalSymbols,
} from "./types";

export function isBodyInit(value: unknown): value is BodyInit {
  return (
    value === null ||
    typeof value === "string" ||
    value instanceof Blob ||
    value instanceof ArrayBuffer ||
    ArrayBuffer.isView(value) ||
    value instanceof FormData ||
    value instanceof URLSearchParams ||
    value instanceof ReadableStream
  );
}

export function mergeHeadersInto(first: Headers, ...sources: Headers[]) {
  for (const source of sources) {
    const headers: Headers = new Headers(source);

    for (const [key, value] of headers.entries()) {
      if (key === "set-cookie") {
        if (!first.getSetCookie().includes(value)) first.append(key, value);
      } else {
        if (first.get(key) !== value) first.set(key, value);
      }
    }
  }

  return first;
}

/**
 * Cancels the body of a Response that a response function replaced, so an endless one (SSE, a proxied stream)
 * does not keep running. The body is left alone when the replacement may still use it: when it is the same stream,
 * or when something locked or read it by the next macrotask (`pipeThrough`, `clone`, `text()`, a wrapper that pulls
 * from it). A wrapper that only starts reading later (`highWaterMark: 0`, such as `ReadableStream.from`) is not seen.
 */
export function cancelReplacedBody(replaced: Response, replacement: Response | null | undefined): void {
  const body = replaced.body;
  if (!replacement || replacement === replaced || !body || replacement.body === body) return;
  setTimeout(() => {
    if (!body.locked && !replaced.bodyUsed) body.cancel().catch(() => {});
  });
}

/**
 * A Response whose headers a response function may change: a copy of one with immutable headers, as
 * `Response.redirect()` and `fetch()` return everywhere except on Bun, else the Response itself
 */
export function withMutableHeaders(response: Response): Response {
  // A status under 200, as `Response.error()`'s 0, can't be copied
  if (response.status < 200) return response;
  const probe = "x-universal-middleware-probe";
  const value = response.headers.get(probe);
  try {
    // Throws only on immutable headers, and leaves them as they were
    if (value === null) response.headers.delete(probe);
    else response.headers.set(probe, value);
    return response;
  } catch {
    // The constructor resets them: a response function may read where a proxied `fetch()` response came from
    return Object.defineProperties(new Response(response.body, response), {
      url: { value: response.url },
      redirected: { value: response.redirected },
      type: { value: response.type },
    });
  }
}

export function nodeHeadersToWeb(nodeHeaders: OutgoingHttpHeaders): Headers {
  const headers: [string, string][] = [];

  const keys = Object.keys(nodeHeaders);
  for (const key of keys) {
    const value = nodeHeaders[key];

    if (Array.isArray(value)) {
      for (const item of value) {
        headers.push([key, item]);
      }
    } else {
      headers.push([key, normalizeHttpHeader(value)]);
    }
  }

  return new Headers(headers);
}

function normalizeHttpHeader(value: string | number | undefined): string {
  return value === undefined ? "" : String(value);
}

export function url(request: { url: string; [urlSymbol]?: URL }): URL {
  if (request[urlSymbol]) {
    return request[urlSymbol];
  }
  if (Object.isFrozen(request) || Object.isSealed(request)) {
    return new URL(request.url);
  }
  request[urlSymbol] = new URL(request.url);
  return request[urlSymbol];
}

export function cloneRequest(request: Request, fields?: RequestInit & { url?: string }) {
  if (!fields) {
    return request.clone();
  }

  return new Request(fields?.url ?? request.url, {
    method: fields?.method ?? request.method,
    headers: fields?.headers ?? request.headers,
    body: fields?.body ?? request.body,
    mode: fields?.mode ?? request.mode,
    credentials: fields?.credentials ?? request.credentials,
    cache: fields?.cache ?? request.cache,
    redirect: fields?.redirect ?? request.redirect,
    referrer: fields?.referrer ?? request.referrer,
    integrity: fields?.integrity ?? request.integrity,
    keepalive: fields?.keepalive ?? request.keepalive,
    referrerPolicy: fields?.referrerPolicy ?? request.referrerPolicy,
    signal: fields?.signal ?? request.signal,
    // @ts-expect-error RequestInit: duplex option is required when sending a body
    duplex: "half",
  });
}

// On the request rather than in a map, so that every copy of this package sees what another one kept
type KeptRequest = Request & { [keepBodySymbol]?: () => Promise<ArrayBuffer> | undefined };

/** The bytes `keepBody()` kept for `request`, once something read its body through a method */
export function keptBody(request: Request): Promise<ArrayBuffer> | undefined {
  return (request as KeptRequest)[keepBodySymbol]?.();
}

/**
 * Makes the body of `request` readable by every middleware and the handler: the first read through a body method
 * keeps the bytes, and every read after it, `body` and `clone()` included, is served from them. A body nobody reads
 * through a method, such as one a handler streams from `request.body`, is never buffered.
 */
export function keepBody(request: Request) {
  // By method, not `request.body`: on `@hono/node-server`, reading `body` builds the full Request
  if (request.method === "GET" || request.method === "HEAD") return;
  if (keepBodySymbol in request || !Object.isExtensible(request)) return;
  const proto = Object.getPrototypeOf(request);
  // srvx's Node request (srvx, h3) reads a `rawBody` set before it (Google Cloud Functions) in `text()` and `json()` only
  const rawBody = (request as { runtime?: { node?: { req?: { rawBody?: unknown } } } }).runtime?.node?.req?.rawBody;
  const read =
    rawBody instanceof Uint8Array ? async () => new Uint8Array(rawBody).buffer : request.arrayBuffer.bind(request);
  const clone = request.clone.bind(request);
  // The type when the body is read: a middleware may set it (Bun drops a FormData body's type once read)
  const keptType = request.headers.get("content-type") ?? "";
  const type = () => request.headers.get("content-type") ?? keptType;
  let kept: Promise<ArrayBuffer> | undefined;
  const bytes = () => {
    if (!kept) {
      kept = read();
      // A body streamed before, or an aborted upload: `body`, `bodyUsed` and `clone()` are the request's own again
      kept.catch(() => {
        kept = undefined;
      });
    }
    return kept;
  };
  // Each reader gets its own copy, as with a body read natively: changing or transferring it changes no other read
  const copy = async () => (await bytes()).slice(0);
  const replay = () =>
    new ReadableStream<Uint8Array>(
      {
        async pull(controller) {
          controller.enqueue(new Uint8Array(await copy()));
          controller.close();
        },
      },
      { highWaterMark: 0 },
    );
  // `request.blob()` normalizes the type and `new Blob()` doesn't (Bun's even adds a charset to a URL-encoded one)
  const asResponse = async () => new Response(await bytes(), { headers: { "content-type": type() } });
  // A request without a body keeps its `null` body
  const replays = () => kept && Reflect.get(proto, "body", request) !== null;
  // Configurable, so that instrumentation can still wrap them
  Object.defineProperties(request, {
    [keepBodySymbol]: { configurable: true, value: () => kept && copy() },
    arrayBuffer: { configurable: true, value: copy },
    bytes: { configurable: true, value: async () => new Uint8Array(await copy()) },
    text: { configurable: true, value: async () => new TextDecoder().decode(await bytes()) },
    json: { configurable: true, value: async () => JSON.parse(new TextDecoder().decode(await bytes())) },
    blob: { configurable: true, value: async () => (await asResponse()).blob() },
    formData: { configurable: true, value: async () => (await asResponse()).formData() },
    // Once kept, the stream and `bodyUsed` describe the kept bytes, not the request's own stream
    body: { configurable: true, get: () => (replays() ? replay() : Reflect.get(proto, "body", request)) },
    bodyUsed: { configurable: true, get: () => (kept ? false : Reflect.get(proto, "bodyUsed", request)) },
    clone: { configurable: true, value: () => (replays() ? cloneRequest(request, { body: replay() }) : clone()) },
  });
}

export function getUniversal<T extends object>(subject: T | { [universalSymbol]: T }): T {
  return universalSymbol in subject ? subject[universalSymbol] : subject;
}

export function getUniversalProp<T extends object, K extends keyof UniversalSymbols>(
  subject: T | { [universalSymbol]: T },
  prop: K,
): UniversalSymbols[K] | undefined;
export function getUniversalProp<T extends object, K extends keyof UniversalSymbols>(
  subject: T | { [universalSymbol]: T },
  prop: K,
  defaultValue: UniversalSymbols[K],
): UniversalSymbols[K];
export function getUniversalProp<T extends object, K extends keyof UniversalSymbols>(
  subject: T | { [universalSymbol]: T },
  prop: K,
  defaultValue?: UniversalSymbols[K] | undefined,
): UniversalSymbols[K] | undefined {
  if (prop in subject) return (subject as UniversalSymbols)[prop];
  if (universalSymbol in subject) return (subject as Record<symbol, UniversalSymbols>)[universalSymbol][prop];
  return defaultValue;
}

/**
 * The enhance helper provides a way to attach metadata to Middlewares and Handlers.
 * This metadata can include routing information like path and method, as well as order for automatic middleware sequencing.
 * @see {@link https://universal-middleware.dev/helpers/enhance}
 */
export function enhance<F extends AnyFn, O extends UniversalOptionsArg>(
  middleware: F,
  options: O,
): F & WithUniversalSymbols<O> {
  const { immutable, ...rest } = options;
  // biome-ignore lint/suspicious/noExplicitAny: ignored
  const m: any = immutable === false ? middleware : cloneFunction(middleware);
  for (const [key, value] of Object.entries(rest)) {
    if (key in optionsToSymbols) {
      m[optionsToSymbols[key as keyof UniversalOptions]] = value;
    }
  }
  if (typeof options.name === "string") {
    const descriptor = Object.getOwnPropertyDescriptor(m, "name");
    if (!descriptor || descriptor.configurable) {
      Object.defineProperty(m, "name", { value: options.name, configurable: true });
    }
  }
  return m;
}

/**
 * @internal
 */
export function ordered(middlewares: EnhancedMiddleware[]) {
  return Array.from(middlewares).sort(
    (a, b) => getUniversalProp(a, orderSymbol, 0) - getUniversalProp(b, orderSymbol, 0),
  );
}

/**
 * @internal
 */
export function cloneFunction<F extends AnyFn>(originalFn: F): F {
  const extendedFunction = function (this: unknown, ...args: unknown[]) {
    // Use Reflect.apply to invoke the original function
    return Reflect.apply(Object.getPrototypeOf(extendedFunction), this, args);
  };

  Object.setPrototypeOf(extendedFunction, originalFn);
  Object.defineProperty(extendedFunction, "name", { value: originalFn.name, configurable: true });

  return extendedFunction as F;
}

/**
 * @internal
 */
export function bindUniversal<
  // biome-ignore lint/suspicious/noExplicitAny: ignored
  U extends UniversalHandler<any> | UniversalMiddleware<any, any>,
  F extends UniversalFn<U, AnyFn>,
>(universal: U, fn: SetThis<F, { [universalSymbol]: U }>, wrapper?: AnyFn): F {
  const unboundFn = unboundSymbol in fn ? (fn[unboundSymbol] as F) : fn;
  const self = { [universalSymbol]: universal, [unboundSymbol]: unboundFn };
  const boundFn = unboundFn.bind(self) as F;
  Object.assign(boundFn, self);
  return wrapper ? (wrapper(boundFn) as F) : boundFn;
}

/**
 * @internal
 */
export function attachUniversal<
  // biome-ignore lint/suspicious/noExplicitAny: ignored
  U extends UniversalHandler<any> | UniversalMiddleware<any, any>,
  T extends {},
>(universal: U, subject: T): T & { [universalSymbol]: U } {
  return Object.assign(subject, { [universalSymbol]: universal });
}

/**
 * A middleware is considered a handler if:
 * - It has an order equal to 0
 * - It has a path and no order
 *
 * Use it in an adapter that installs handlers itself, so they are classified the same way core does.
 */
export function isHandler(m: EnhancedMiddleware) {
  const order = getUniversalProp(m, orderSymbol);
  const path = getUniversalProp(m, pathSymbol);
  if (typeof order === "number") {
    return order === 0;
  }
  return Boolean(path);
}
