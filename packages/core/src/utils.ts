import type { OutgoingHttpHeaders } from "node:http";
import { unboundSymbol, universalSymbol, urlSymbol } from "./const";
import type { AnyFn, SetThis, UniversalFn, UniversalHandler, UniversalMiddleware, UniversalSymbols } from "./types";

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
  return request[urlSymbol] ?? (request[urlSymbol] = new URL(request.url));
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
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
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
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  U extends UniversalHandler<any> | UniversalMiddleware<any, any>,
  T extends {},
>(universal: U, subject: T): T & { [universalSymbol]: U } {
  return Object.assign(subject, { [universalSymbol]: universal });
}
