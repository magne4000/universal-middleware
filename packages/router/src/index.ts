import type { UniversalHandler, UniversalMiddleware } from "@universal-middleware/core";
import { pipe, universalSymbol } from "@universal-middleware/core";
import { createHandler, createMiddleware } from "@universal-middleware/hono";
import type { Hono } from "hono";
import { type RouterContext, addRoute, createRouter, findRoute } from "rou3";

export interface RouteDefinition {
  method: "get";
  path: string;
  handler: UniversalHandler;
}

export type MiddlewareDefinition = [middleware: UniversalMiddleware, order: number];

export interface UniversalRouterInterface {
  use(middleware: UniversalMiddleware, order?: number): this;
  route(method: RouteDefinition["method"], path: string, handler: UniversalHandler): this;
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
    this.#middlewares.push([middleware, order ?? 0]);
    return this;
  }

  // TODO https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods
  route(method: RouteDefinition["method"], path: string, handler: UniversalHandler) {
    addRoute(this.router, method.toLocaleUpperCase() as Uppercase<RouteDefinition["method"]>, path, handler);
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

  route(method: RouteDefinition["method"], path: string, handler: UniversalHandler) {
    this.#app[method](path, createHandler(() => handler)());
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
      router.route(r.method, r.path, r.handler);
    }
  }
}

function ordered(middlewares: MiddlewareDefinition[]) {
  return Array.from(middlewares)
    .sort((a, b) => a[1] - b[1])
    .map((x) => x[0]);
}

// middlewares
//   order
// routes
//   handlers
