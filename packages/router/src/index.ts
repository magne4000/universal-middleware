import type { AnyFn, UniversalHandler, UniversalMiddleware } from "@universal-middleware/core";
import { pipe, universalSymbol } from "@universal-middleware/core";
import { createHandler, createMiddleware } from "@universal-middleware/hono";
import type { Hono } from "hono";
import { type RouterContext, addRoute, createRouter, findRoute } from "rou3";

export const pathSymbol = Symbol.for("unPath");
export const methodSymbol = Symbol.for("unMethod");
export const orderSymbol = Symbol.for("unOrder");

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

export type HttpMethod = "GET";
export type RouteDefinition = UniversalHandler & { [methodSymbol]: HttpMethod; [pathSymbol]: string };
export type MiddlewareDefinition = UniversalMiddleware & { [orderSymbol]: MiddlewareOrder | number };

export interface UniversalRouterInterface {
  use(middleware: MiddlewareDefinition): this;
  route(handler: RouteDefinition): this;
}

function cloneFunction<F extends AnyFn>(originalFn: F): F {
  // Create a clone of the function
  const clonedFn = originalFn.bind(null) as F;

  // Copy over all properties from the original function to the clone
  Object.defineProperties(clonedFn, Object.getOwnPropertyDescriptors(originalFn));

  return clonedFn;
}

export function withOrder(middleware: UniversalMiddleware, order: MiddlewareOrder | number): MiddlewareDefinition {
  const m = cloneFunction(middleware) as MiddlewareDefinition;
  m[orderSymbol] = order;
  return m;
}

export function withRoute(handler: UniversalHandler, method: HttpMethod, path: string): RouteDefinition {
  const h = cloneFunction(handler) as RouteDefinition;
  h[methodSymbol] = method;
  h[pathSymbol] = path;
  return h;
}

export class UniversalRouter implements UniversalRouterInterface {
  public router: RouterContext<UniversalHandler>;
  #middlewares: MiddlewareDefinition[];
  #computedMiddleware?: UniversalMiddleware;

  constructor() {
    this.router = createRouter<UniversalHandler>();
    this.#middlewares = [];
  }

  use(middleware: UniversalMiddleware, order?: number) {
    this.#computedMiddleware = undefined;
    this.#middlewares.push(withOrder(middleware, order ?? 0));
    return this;
  }

  route(handler: RouteDefinition) {
    addRoute(this.router, handler[methodSymbol], handler[pathSymbol], handler);
    return this;
  }

  // TODO? routes to adapter?
  //  Or UniversalRouter extends per adapter, e.g. UniversalHonoRouter
  // routes() {
  //   this.router.root;
  // }
  //
  // middlewares() {
  //   return ordered(this.#middlewares);
  // }

  get [universalSymbol](): UniversalMiddleware {
    if (!this.#computedMiddleware && this.#middlewares.length > 0) {
      this.#computedMiddleware = pipe(...ordered(this.#middlewares));
    }
    return (request, ctx, runtime) => {
      // TODO core helper to cache the result
      const url = new URL(request.url);
      const router = findRoute(this.router, request.method, url.pathname);

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

  use(middleware: UniversalMiddleware) {
    this.#app.use(createMiddleware(() => middleware)());
    return this;
  }

  route(handler: RouteDefinition) {
    this.#app[handler[methodSymbol].toLocaleLowerCase() as Lowercase<HttpMethod>](
      handler[pathSymbol],
      createHandler(() => handler)(),
    );
    return this;
  }
}

export function apply(
  router: UniversalRouterInterface,
  routes?: RouteDefinition[],
  middlewares?: MiddlewareDefinition[],
) {
  if (middlewares) {
    const ms = ordered(middlewares);
    for (const m of ms) {
      router.use(m);
    }
  }
  if (routes) {
    for (const r of routes) {
      router.route(r);
    }
  }
}

function ordered(middlewares: MiddlewareDefinition[]) {
  return Array.from(middlewares)
    .sort((a, b) => a[orderSymbol] - b[orderSymbol])
    .map((x) => x);
}

// middlewares
//   order
// routes
//   handlers
