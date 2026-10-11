import { addRoute, createRouter, findRoute, type RouterContext } from "rou3";
import { contextSymbol, methodSymbol, nameSymbol, orderSymbol, pathSymbol, universalSymbol } from "./const";
import { decodeParams, decodePath, decodePattern, encodePath } from "./decode";
import { pipe, pipeMiddlewares } from "./pipe";
import type {
  Enhance,
  EnhancedMiddleware,
  HttpMethod,
  UniversalHandler,
  UniversalMiddleware,
  UniversalRouterInterface,
} from "./types";
import { enhance, getUniversal, getUniversalProp, isHandler, ordered, url } from "./utils";

export class UniversalRouter implements UniversalRouterInterface {
  public router: RouterContext<Enhance<UniversalHandler>>;
  #middlewares: EnhancedMiddleware[];
  #pipeMiddlewaresInUniversalRoute: boolean;
  #handle404: boolean;

  constructor(pipeMiddlewaresInUniversalRoute = true, handle404 = false) {
    this.router = createRouter<UniversalHandler>();
    this.#middlewares = [];
    this.#pipeMiddlewaresInUniversalRoute = pipeMiddlewaresInUniversalRoute;
    this.#handle404 = handle404;
  }

  use(middleware: EnhancedMiddleware) {
    this.#middlewares.push(middleware);
    return this;
  }

  route(handler: EnhancedMiddleware) {
    const { path, method } = assertRoute(handler);
    addRoutes(this.router, method, path, getUniversal(handler));
    return this;
  }

  applyCatchAll() {
    // A request no route matches gets its 404 from `[universalSymbol]`, whatever its method
    return this;
  }

  get [universalSymbol](): UniversalMiddleware {
    const noCastPipe = pipe.bind({ noCast: true });
    return (request, ctx, runtime) => {
      const router = match(this.router, request);

      if (router) {
        const routerCtx = getUniversalProp(router.data, contextSymbol);
        if (routerCtx) {
          Object.assign(ctx, routerCtx);
        }
        const handler =
          this.#pipeMiddlewaresInUniversalRoute && this.#middlewares.length > 0
            ? // biome-ignore lint/suspicious/noExplicitAny: ignored
              (noCastPipe(...(this.#middlewares as any[]), router.data) as UniversalHandler)
            : router.data;
        if (router.params) {
          runtime.params ??= {};
          Object.assign(runtime.params, decodeParams(router.params));
        }
        return handler(request, ctx, runtime);
      }
      if (this.#pipeMiddlewaresInUniversalRoute && this.#middlewares.length > 0) {
        const unmatched = this.#handle404 ? [...this.#middlewares, notFound] : this.#middlewares;
        // `pipe` resolves the object form of an EnhancedMiddleware at runtime, but its types only accept functions
        const middlewares = noCastPipe(...(unmatched as unknown as UniversalMiddleware[])) as UniversalMiddleware;
        return middlewares(request, ctx, runtime);
      }
      if (this.#handle404) {
        return notFound();
      }
    };
  }
}

function notFound() {
  return new Response("NOT FOUND", {
    status: 404,
  });
}

export function apply(router: UniversalRouterInterface, middlewares: EnhancedMiddleware[], defer?: boolean) {
  const { middleware, handlers } = split(middlewares);

  if (middleware) {
    router.use(middleware);
  }
  for (const handler of handlers) {
    router.route(handler);
  }
  if (!defer) {
    router.applyCatchAll();
  }
}

export async function applyAsync(
  router: UniversalRouterInterface<"async">,
  middlewares: EnhancedMiddleware[],
  defer?: boolean,
) {
  const { middleware, handlers } = split(middlewares);

  if (middleware) {
    await router.use(middleware);
  }
  for (const handler of handlers) {
    await router.route(handler);
  }
  if (!defer) {
    await router.applyCatchAll();
  }
}

// The middlewares that aren't handlers become one. After an answer, only the post-handler ones (positive `order`) run
function split(middlewares: EnhancedMiddleware[]) {
  const ms = ordered(middlewares);
  const afterHandlers = (m: EnhancedMiddleware) => getUniversalProp(m, orderSymbol, 0) > 0;
  const before = ms.filter((m) => !isHandler(m) && !afterHandlers(m)).map(scopeToPath);
  const after = ms.filter(afterHandlers).map(scopeToPath);
  return {
    middleware: before.length + after.length > 0 ? pipeMiddlewares(before, after) : undefined,
    handlers: ms.filter(isHandler),
  };
}

/**
 * Wraps a middleware that has a `path` so it runs only for the requests a route with that `path` and `method` would
 * match, as `apply()` does. A middleware without a `path` is returned as is.
 */
export function scopeToPath(middleware: EnhancedMiddleware): EnhancedMiddleware {
  const path = getUniversalProp(middleware, pathSymbol);
  if (!path) return middleware;
  const isMatch = createMatcher(path, getUniversalProp(middleware, methodSymbol));
  const umMiddleware = getUniversal(middleware) as UniversalMiddleware;
  const scoped: UniversalMiddleware = (request, ctx, runtime) =>
    isMatch(request) ? umMiddleware(request, ctx, runtime) : undefined;
  // `pipe` sorts by `order` again
  return enhance(scoped, { order: getUniversalProp(middleware, orderSymbol), immutable: false });
}

/**
 * Returns a check of whether a route with this `path` and `method` matches a request, as `apply()` routes it: the
 * decoded pathname is matched, a `GET` route also matches `HEAD`, and without `method` any method matches.
 */
export function createMatcher(path: string, method?: HttpMethod | HttpMethod[]): (request: Request) => boolean {
  const router = createRouter<true>();
  addRoutes(router, method, path, true);
  return (request) => match(router, request) !== undefined;
}

function addRoutes<T>(router: RouterContext<T>, method: string | string[] | undefined, rawPath: string, data: T) {
  const path = decodePattern(rawPath);
  for (const m of Array.isArray(method) ? method : [method]) {
    addRoute(router, m, path, data);
  }
}

// A `GET` route also answers `HEAD`, unless a route for `HEAD` matches
function match<T>(router: RouterContext<T>, request: Request) {
  const pathname = encodePath(decodePath(url(request).pathname));
  const route = findRoute(router, request.method, pathname);
  if (route || request.method !== "HEAD") return route;
  return findRoute(router, "GET", pathname);
}

/**
 * @beta
 */
export function pipeRoute(
  middlewares: EnhancedMiddleware[],
  { pipeMiddlewaresInUniversalRoute = true, handle404 = false } = {},
) {
  const router = new UniversalRouter(pipeMiddlewaresInUniversalRoute, handle404);
  apply(router, middlewares);
  return router[universalSymbol];
}

function assertRoute(middleware: EnhancedMiddleware) {
  const path = getUniversalProp(middleware, pathSymbol);
  if (!path) {
    const name = getUniversalProp(middleware, nameSymbol);
    throw new TypeError(assertRouteErrorMessage("path", name));
  }
  const method = getUniversalProp(middleware, methodSymbol);
  if (!method) {
    const name = getUniversalProp(middleware, nameSymbol);
    throw new TypeError(assertRouteErrorMessage("method", name));
  }
  return { path, method };
}

function assertRouteErrorMessage(key: string, name: string | undefined) {
  if (name) {
    return `Route ${name} is defined without a "${key}". See https://universal-middleware.dev/helpers/enhance for details.`;
  }
  return `Unnamed route is defined without a "${key}". See https://universal-middleware.dev/helpers/enhance for details.`;
}
