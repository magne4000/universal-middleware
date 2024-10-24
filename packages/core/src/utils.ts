import type { IncomingMessage, OutgoingHttpHeaders } from "node:http";
import { universalHeaderUuid, universalHeaderUuidSymbol } from "./const";
import type { RuntimeAdapter } from "./types";

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

const globalAny = globalThis as unknown as {
  __um_ctx: Map<
    string,
    {
      context: Universal.Context;
      runtime: RuntimeAdapter;
    }
  >;
  __um_reg: FinalizationRegistry<string> | undefined;
};

if (!globalAny.__um_ctx) {
  globalAny.__um_ctx = new Map();
}

if (!globalAny.__um_reg && typeof FinalizationRegistry !== "undefined") {
  globalAny.__um_reg = new FinalizationRegistry((uuid) => {
    console.log("DELETED", uuid);
    globalAny.__um_ctx.delete(uuid);
  });
}

function initRequestUuid<R extends RuntimeAdapter>(lifetime: object, runtime: R) {
  const uuid = crypto.randomUUID();
  globalAny.__um_reg?.register(lifetime, uuid);
  globalAny.__um_ctx.set(uuid, {
    context: {},
    runtime,
  });
  return uuid;
}

/**
 * @internal
 */
export function initRequestWeb<R extends RuntimeAdapter>(
  request: Request,
  lifetime: object,
  getRuntime: () => R,
  lifetimeData?: object,
): void {
  if (
    request.headers.has(universalHeaderUuid) ||
    // @ts-expect-error
    lifetimeData?.[universalHeaderUuidSymbol]
  )
    return;
  const uuid = initRequestUuid(lifetime, getRuntime());
  console.log("initRequestWeb", "SET UUID", uuid);
  try {
    // This can fail in some environments, like Miniflare (or other tools using undici),
    // because headers is immutable
    request.headers.set(universalHeaderUuid, uuid);
  } catch {
    Object.defineProperty(request, "headers", {
      configurable: false,
      writable: false,
      enumerable: true,
      value: new Headers(Array.from(request.headers)),
    });
    request.headers.set(universalHeaderUuid, uuid);
  }
  if (lifetimeData) {
    // @ts-expect-error
    lifetimeData[universalHeaderUuidSymbol] = uuid;
  }
}

/**
 * @internal
 */
export function initRequestNode<R extends RuntimeAdapter>(
  request: IncomingMessage,
  lifetime: object,
  getRuntime: () => R,
): void {
  if (typeof request.headers[universalHeaderUuid] === "string") return;
  const uuid = initRequestUuid(lifetime, getRuntime());
  console.log("initRequestNode", "SET UUID", uuid);
  request.headers[universalHeaderUuid] = uuid;
}

export function getRequestContextAndRuntime<
  C extends Universal.Context = Universal.Context,
  R extends RuntimeAdapter = RuntimeAdapter,
>(request: Request, lifetimeData?: object): { context: C; runtime: R } {
  const uuid =
    request.headers.get(universalHeaderUuid) ??
    // @ts-expect-error
    lifetimeData?.[universalHeaderUuidSymbol];

  if (!uuid) {
    throw new Error(
      `${universalHeaderUuid} header should be present. Please open an issue at https://github.com/magne4000/universal-middleware/issues`,
    );
  }

  const contextRuntime = globalAny.__um_ctx.get(uuid);

  if (!contextRuntime) {
    throw new Error(
      "Unable to retrieve the context of current Request. Please open an issue at https://github.com/magne4000/universal-middleware/issues",
    );
  }

  return contextRuntime as { context: C; runtime: R };
}

export function setRequestContextAndRuntime<
  C extends Universal.Context = Universal.Context,
  R extends RuntimeAdapter = RuntimeAdapter,
>(request: Request, contextRuntime: { context?: C; runtime?: R }, lifetimeData?: object): void {
  const value = getRequestContextAndRuntime(request, lifetimeData);
  if (contextRuntime.context) {
    value.context = contextRuntime.context;
  }
  if (contextRuntime.runtime) {
    value.runtime = contextRuntime.runtime;
  }
}
