import type { AnyFn, UniversalHandler, UniversalMiddleware } from "@universal-middleware/core";
import { pipe, universalSymbol } from "@universal-middleware/core";
import { createHandler, createMiddleware } from "@universal-middleware/hono";
import type { Hono } from "hono";
import { type RouterContext, addRoute, createRouter, findRoute } from "rou3";

export const pathSymbol = Symbol.for("unPath");
export const methodSymbol = Symbol.for("unMethod");
export const orderSymbol = Symbol.for("unOrder");

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

export type HttpMethod = "GET" | "POST";
export type WithRoute<T> = T & { [methodSymbol]: HttpMethod; [pathSymbol]: string };
export type WithOrder<T> = T & { [orderSymbol]: MiddlewareOrder | number };
export type RouteDefinition = WithRoute<UniversalHandler>;
export type MiddlewareDefinition = WithOrder<UniversalMiddleware>;

export interface UniversalRouterInterface {
  use(middleware: UniversalMiddleware | { [universalSymbol]: UniversalMiddleware }): this;
  route(handler: RouteDefinition | { [universalSymbol]: RouteDefinition }): this;
}

// TODO: merge this with bindUniversal?
export function cloneFunction<F extends AnyFn>(originalFn: F): F {
  const extendedFunction = function (this: unknown, ...args: unknown[]) {
    // Use Reflect.apply to invoke the original function
    return Reflect.apply(Object.getPrototypeOf(extendedFunction), this, args);
  };

  Object.setPrototypeOf(extendedFunction, originalFn);

  return extendedFunction as F;
}

export function withOrder<F extends AnyFn>(middleware: F, order: MiddlewareOrder | number): WithOrder<F> {
  const m = cloneFunction(middleware) as WithOrder<F>;
  m[orderSymbol] = order;
  return m;
}

export function withRoute<F extends AnyFn>(handler: F, method: HttpMethod, path: string): WithRoute<F> {
  const h = cloneFunction(handler) as WithRoute<F>;
  h[methodSymbol] = method;
  h[pathSymbol] = path;
  return h;
}

// TODO: core utils?
function getUniversal<T extends object>(subject: T | { [universalSymbol]: T }): T {
  return universalSymbol in subject ? subject[universalSymbol] : subject;
}

function getUniversalProp<T extends object>(
  subject: T | { [universalSymbol]: T },
  prop: typeof methodSymbol,
): HttpMethod | undefined;
function getUniversalProp<T extends object>(
  subject: T | { [universalSymbol]: T },
  prop: typeof pathSymbol,
): string | undefined;
function getUniversalProp<T extends object>(
  subject: T | { [universalSymbol]: T },
  prop: typeof orderSymbol,
): MiddlewareOrder | number | undefined;
function getUniversalProp<T extends object>(subject: T | { [universalSymbol]: T }, prop: symbol): unknown {
  if (prop in subject) return (subject as Record<symbol, unknown>)[prop];
  if (universalSymbol in subject) return (subject as Record<symbol, Record<symbol, unknown>>)[universalSymbol][prop];
  return undefined;
}

// Can be used to handle +middleware.ts
export class UniversalRouter implements UniversalRouterInterface {
  public router: RouterContext<UniversalHandler>;
  #middlewares: MiddlewareDefinition[];
  #computedMiddleware?: UniversalMiddleware;

  constructor() {
    this.router = createRouter<UniversalHandler>();
    this.#middlewares = [];
  }

  use(middleware: MiddlewareDefinition | { [universalSymbol]: MiddlewareDefinition }) {
    this.#computedMiddleware = undefined;
    this.#middlewares.push(getUniversal(middleware));
    return this;
  }

  route(handler: RouteDefinition | { [universalSymbol]: RouteDefinition }) {
    const umHandler = getUniversal(handler);

    const method = getUniversalProp(handler, methodSymbol);
    if (!method) {
      throw new Error("TODO: METHOD must be defined");
    }

    const path = getUniversalProp(handler, pathSymbol);
    if (!path) {
      throw new Error("TODO: PATH must be defined");
    }

    addRoute(this.router, method, path, umHandler);
    return this;
  }

  get [universalSymbol](): UniversalMiddleware {
    if (!this.#computedMiddleware && this.#middlewares.length > 0) {
      this.#computedMiddleware = pipe(...ordered(this.#middlewares));
    }
    return (request, ctx, runtime) => {
      // TODO core helper to cache the result
      const url = new URL(request.url);
      const router = findRoute(this.router, request.method, url.pathname);

      // TODO handle middlewares like Logging. Probably requires updating all adapters too.
      if (router) {
        const handler = this.#computedMiddleware ? pipe(this.#computedMiddleware, router.data) : router.data;
        return handler(request, ctx, runtime);
      }
      if (this.#computedMiddleware) {
        return this.#computedMiddleware(request, ctx, runtime);
      }
      // else do nothing
    };
  }
}

export class UniversalHonoRouter implements UniversalRouterInterface {
  #app: Hono;

  constructor(app: Hono) {
    this.#app = app;
  }

  use(middleware: MiddlewareDefinition | { [universalSymbol]: MiddlewareDefinition }) {
    this.#app.use(createMiddleware(() => getUniversal(middleware))());
    return this;
  }

  route(handler: RouteDefinition | { [universalSymbol]: RouteDefinition }) {
    const umHandler = getUniversal(handler);

    const method = getUniversalProp(handler, methodSymbol);
    if (!method) {
      throw new Error("TODO: METHOD must be defined");
    }

    const path = getUniversalProp(handler, pathSymbol);
    if (!path) {
      throw new Error("TODO: PATH must be defined");
    }

    this.#app[method.toLocaleLowerCase() as Lowercase<HttpMethod>](path, createHandler(() => umHandler)());
    return this;
  }
}

type Routes =
  | RouteDefinition
  | { [universalSymbol]: RouteDefinition }
  | (WithRoute<AnyFn> & { [universalSymbol]: UniversalHandler });
type Middlewares =
  | MiddlewareDefinition
  | { [universalSymbol]: MiddlewareDefinition }
  | (WithRoute<AnyFn> & { [universalSymbol]: UniversalMiddleware });

export function apply(router: UniversalRouterInterface, routesAndMiddlewares: (Routes | Middlewares)[]) {
  const routes = routesAndMiddlewares.filter((x) => getUniversalProp(x, pathSymbol)) as Routes[];
  const middlewares = routesAndMiddlewares.filter((x) => !getUniversalProp(x, pathSymbol)) as Middlewares[];

  // middlewares
  const ms = ordered(middlewares);
  for (const m of ms) {
    router.use(m);
  }

  // routes
  for (const r of routes) {
    router.route(r);
  }
}

function ordered(
  middlewares: (
    | MiddlewareDefinition
    | { [universalSymbol]: MiddlewareDefinition }
    | (WithRoute<AnyFn> & { [universalSymbol]: UniversalMiddleware })
  )[],
) {
  return Array.from(middlewares)
    .sort((a, b) => (getUniversalProp(a, orderSymbol) ?? 0) - (getUniversalProp(b, orderSymbol) ?? 0))
    .map(getUniversal);
}
