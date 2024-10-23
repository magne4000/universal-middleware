import type { OutgoingHttpHeaders } from "node:http";
import { contextSymbol, runtimeSymbol } from "./const";
import type { RuntimeAdapter, UniversalRequest } from "./types";

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

/**
 * @internal
 */
export function attachContextAndRuntime<C extends Universal.Context, R extends RuntimeAdapter>(
  request: Request,
  ctx: C,
  runtime?: R,
): UniversalRequest<C> {
  (request as UniversalRequest<C, R>)[contextSymbol] = ctx;
  if (runtime) {
    (request as UniversalRequest<C, R>)[runtimeSymbol] = runtime;
  }
  return request as UniversalRequest<C, R>;
}

export function getRequestContext<C extends Universal.Context>(request: Request): C {
  return (request as UniversalRequest<C>)[contextSymbol] ?? {};
}

export function getRequestRuntime<R extends RuntimeAdapter>(request: Request): R {
  return (request as UniversalRequest<Universal.Context, R>)[runtimeSymbol] ?? { adapter: "other", runtime: "other" };
}
