import type { OutgoingHttpHeaders } from "node:http";
import { optionsToSymbols, orderSymbol, pathSymbol, unboundSymbol, universalSymbol, urlSymbol } from "./const";
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

export function nodeHeadersToWeb(nodeHeaders: OutgoingHttpHeaders): Headers {
  const headers: [string, string][] = [];

  const keys = Object.keys(nodeHeaders);
  for (const key of keys) {
    headers.push([key, normalizeHttpHeader(nodeHeaders[key])]);
  }

  return new Headers(headers);
}

function normalizeHttpHeader(value: string | string[] | number | undefined): string {
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  return (value as string) || "";
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
 * @internal
 */
export function isHandler(m: EnhancedMiddleware) {
  const order = getUniversalProp(m, orderSymbol);
  const path = getUniversalProp(m, pathSymbol);
  if (typeof order === "number") {
    if (order !== 0 && path) {
      // `pathSymbol` not supported for middlewares (yet?)
      console.warn(
        `Found a Universal Middleware with "path" metadata. ` +
          "This will lead to unpredictable behaviour. " +
          "Please open an issue at https://github.com/magne4000/universal-middleware and explain your use case with the expected behaviour.",
      );
    }
    return order === 0;
  }
  return Boolean(path);
}
