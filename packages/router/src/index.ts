import type { AnyFn, UniversalHandler, UniversalMiddleware } from "@universal-middleware/core";
import { pipe, universalSymbol } from "@universal-middleware/core";
import {
  createHandler as createHandlerExpress,
  createMiddleware as createMiddlewareExpress,
} from "@universal-middleware/express";
import {
  createHandler as createHandlerHono,
  createMiddleware as createMiddlewareHono,
} from "@universal-middleware/hono";
import type { Express } from "express";
import type { Hono } from "hono";
import { type RouterContext, addRoute, createRouter, findRoute } from "rou3";

export const pathSymbol = Symbol.for("unPath");
export const methodSymbol = Symbol.for("unMethod");
export const orderSymbol = Symbol.for("unOrder");
export const nameSymbol = Symbol.for("unName");

// TODO: tweak this list
export enum MiddlewareOrder {
  // Pre-handler Middlewares
  GUARD = -1000, // Guard middleware: Ensures specific conditions or headers are met before proceeding.
  AUTHENTICATION = -900, // Authentication middleware: Verifies user credentials or tokens.
  AUTHORIZATION = -800, // Authorization middleware: Ensures the user has permissions for the route.
  RATE_LIMITING = -700, // Rate limiting middleware: Prevents excessive requests from a client.
  INPUT_VALIDATION = -600, // Input validation middleware: Validates the request payload or query parameters.
  CORS = -500, // CORS middleware: Handles Cross-Origin Resource Sharing settings.
  PARSING = -400, // Parsing middleware: Parses body payloads (e.g., JSON, URL-encoded, multipart).
  CUSTOM_PRE_PROCESSING = -300, // Custom pre-processing middleware: Any custom logic before the main handler.

  // Main Handler
  HANDLER = 0, // Main handler that generates the response.

  // Post-handler Middlewares
  RESPONSE_TRANSFORM = 100, // Response transformation middleware: Modifies the response payload.
  HEADER_MANAGEMENT = 200, // Header management middleware: Adds or modifies HTTP headers (e.g., caching, content type).
  RESPONSE_COMPRESSION = 300, // Response compression middleware: Compresses the response payload (e.g., gzip, brotli).
  RESPONSE_CACHING = 400, // Response caching middleware: Implements caching strategies (e.g., ETag, cache-control).
  LOGGING = 500, // Logging middleware: Logs request and response information.
  ERROR_HANDLING = 600, // Error handling middleware: Processes errors and returns user-friendly responses.
  CUSTOM_POST_PROCESSING = 700, // Custom post-processing middleware: Any custom logic after the response is generated.
}

export interface UniversalSymbols {
  [nameSymbol]: string;
  [methodSymbol]: HttpMethod | HttpMethod[];
  [pathSymbol]: string;
  [orderSymbol]: MiddlewareOrder | number;
}

const optionsToSymbols = {
  name: nameSymbol,
  method: methodSymbol,
  path: pathSymbol,
  order: orderSymbol,
} as const;

type OptionsToSymbols = typeof optionsToSymbols;

export type UniversalOptions = {
  [K in keyof OptionsToSymbols]: UniversalSymbols[OptionsToSymbols[K]];
};

export interface UniversalOptionsArg extends Partial<UniversalOptions> {
  /**
   * @default true
   */
  immutable?: boolean;
}

export type WithUniversalSymbols<T extends UniversalOptionsArg> = Pick<
  UniversalSymbols,
  OptionsToSymbols[keyof T & keyof OptionsToSymbols]
>;

// https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods
export type HttpMethod = "GET" | "HEAD" | "POST" | "PUT" | "DELETE" | "CONNECT" | "OPTIONS" | "TRACE" | "PATCH";
export type Decorate<T> = T & Partial<UniversalSymbols>;

export type DecoratedMiddleware =
  | Decorate<UniversalMiddleware>
  | { [universalSymbol]: Decorate<UniversalMiddleware> }
  | (Decorate<AnyFn> & { [universalSymbol]: UniversalMiddleware });

export interface UniversalRouterInterface {
  use(middleware: DecoratedMiddleware): this;
  route(handler: DecoratedMiddleware): this;
  applyCatchAll(): void;
}

export function cloneFunction<F extends AnyFn>(originalFn: F): F {
  const extendedFunction = function (this: unknown, ...args: unknown[]) {
    // Use Reflect.apply to invoke the original function
    return Reflect.apply(Object.getPrototypeOf(extendedFunction), this, args);
  };

  Object.setPrototypeOf(extendedFunction, originalFn);

  return extendedFunction as F;
}

export function decorate<F extends AnyFn, O extends UniversalOptionsArg>(
  middleware: F,
  options: O,
): F & WithUniversalSymbols<O> {
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  const m: any = options.immutable === false ? middleware : cloneFunction(middleware);
  for (const [key, value] of Object.entries(options)) {
    m[optionsToSymbols[key as keyof UniversalOptions]] = value;
  }
  return m;
}

// TODO: core utils?
function getUniversal<T extends object>(subject: T | { [universalSymbol]: T }): T {
  return universalSymbol in subject ? subject[universalSymbol] : subject;
}

function getUniversalProp<T extends object, K extends keyof UniversalSymbols>(
  subject: T | { [universalSymbol]: T },
  prop: K,
): UniversalSymbols[K] | undefined {
  if (prop in subject) return (subject as UniversalSymbols)[prop];
  if (universalSymbol in subject) return (subject as Record<symbol, UniversalSymbols>)[universalSymbol][prop];
  return undefined;
}

function assertRoute(middleware: DecoratedMiddleware) {
  const path = getUniversalProp(middleware, pathSymbol);
  const method = getUniversalProp(middleware, methodSymbol);
  if (!path) {
    throw new Error("decorate: at least one route is missing a `path`");
  }
  if (!method) {
    throw new Error("decorate: at least one route is missing a `method`");
  }
  return { path, method };
}

export class UniversalRouter implements UniversalRouterInterface {
  public router: RouterContext<UniversalHandler>;
  #middlewares: DecoratedMiddleware[];
  #computedMiddleware?: UniversalMiddleware;
  #pipeMiddlewaresInUniversalRoute: boolean;

  constructor(pipeMiddlewaresInUniversalRoute = true) {
    this.router = createRouter<UniversalHandler>();
    this.#middlewares = [];
    this.#pipeMiddlewaresInUniversalRoute = pipeMiddlewaresInUniversalRoute;
  }

  use(middleware: DecoratedMiddleware) {
    this.#computedMiddleware = undefined;
    this.#middlewares.push(middleware);
    return this;
  }

  route(handler: DecoratedMiddleware) {
    const { path, method } = assertRoute(handler);
    const umHandler = getUniversal(handler);

    if (Array.isArray(method)) {
      for (const m of method) {
        addRoute(this.router, m, path, umHandler);
      }
    } else {
      addRoute(this.router, method, path, umHandler);
    }

    return this;
  }

  applyCatchAll() {}

  get [universalSymbol](): UniversalMiddleware {
    if (this.#pipeMiddlewaresInUniversalRoute && !this.#computedMiddleware && this.#middlewares.length > 0) {
      // TODO update `pipe` so that it's aware of `order` and `method`
      this.#computedMiddleware = pipe(...ordered(this.#middlewares).map(getUniversal));
    }
    return (request, ctx, runtime) => {
      // TODO core helper to cache the result
      const url = new URL(request.url);
      const router = findRoute(this.router, request.method, url.pathname);

      // TODO handle middlewares like Logging. Probably requires updating all adapters too.
      if (router) {
        const handler =
          this.#pipeMiddlewaresInUniversalRoute && this.#computedMiddleware
            ? pipe(this.#computedMiddleware, router.data)
            : router.data;
        if (router.params) {
          runtime.params ??= {};
          Object.assign(runtime.params, router.params);
        }
        return handler(request, ctx, runtime);
      }
      if (this.#pipeMiddlewaresInUniversalRoute && this.#computedMiddleware) {
        return this.#computedMiddleware(request, ctx, runtime);
      }
      // TODO should always fallback to 404, some servers might automatically do this, some others don't
      // else do nothing
    };
  }
}

export class UniversalHonoRouter extends UniversalRouter implements UniversalRouterInterface {
  #app: Hono;

  constructor(app: Hono) {
    super(false);
    this.#app = app;
  }

  use(middleware: DecoratedMiddleware) {
    this.#app.use(createMiddlewareHono(() => getUniversal(middleware))());
    return this;
  }

  // route(handler: DecoratedMiddleware) {
  //   const { path, method } = assertRoute(handler);
  //   const umHandler = getUniversal(handler);
  //
  //   this.#app[method.toLocaleLowerCase() as Lowercase<HttpMethod>](
  //     path,
  //     createHandlerHono(() => umHandler as UniversalHandler)(),
  //   );
  //   return this;
  // }

  applyCatchAll() {
    // `/**` will not match `/`
    this.#app.all("/*", createHandlerHono(() => this[universalSymbol] as UniversalHandler)());
  }
}

export class UniversalExpressRouter extends UniversalRouter implements UniversalRouterInterface {
  #app: Express;

  constructor(app: Express) {
    super(false);
    this.#app = app;
  }

  use(middleware: DecoratedMiddleware) {
    this.#app.use(createMiddlewareExpress(() => getUniversal(middleware))());
    return this;
  }

  // route(handler: DecoratedMiddleware) {
  //   const { path, method } = assertRoute(handler);
  //   const umHandler = getUniversal(handler);
  //
  //   this.#app[method.toLocaleLowerCase() as Lowercase<HttpMethod>](
  //     path,
  //     createHandlerExpress(() => umHandler as UniversalHandler)(),
  //   );
  //   return this;
  // }

  applyCatchAll() {
    this.#app.all("/**", createHandlerExpress(() => this[universalSymbol] as UniversalHandler)());
  }
}

export function apply(router: UniversalRouterInterface, middlewares: DecoratedMiddleware[]) {
  const ms = ordered(middlewares);
  for (const m of ms) {
    if (getUniversalProp(m, pathSymbol)) {
      router.route(m);
    } else {
      router.use(m);
    }
  }
  router.applyCatchAll();
}

export function applyHono(app: Hono, middlewares: DecoratedMiddleware[]) {
  const router = new UniversalHonoRouter(app);
  apply(router, middlewares);
}

// TODO check if a user adds a route manually, before catch-all,
//      does this route call all middlewares? (they are declared AFTER, so probably server dependant?)
//      If not, some server `apply` function would need to be split into 2 funtions,
//      not calling `applyCatchAll` in the first one, and the second one only calling it.
//      Another solution could be to have a router.pipe(serverHandler) function to wrap a server handler with all
//      middlewares declared in `router`.
export function applyExpress(app: Express, middlewares: DecoratedMiddleware[]) {
  const router = new UniversalExpressRouter(app);
  apply(router, middlewares);
}

function ordered(middlewares: DecoratedMiddleware[]) {
  return Array.from(middlewares).sort(
    (a, b) => (getUniversalProp(a, orderSymbol) ?? 0) - (getUniversalProp(b, orderSymbol) ?? 0),
  );
}
