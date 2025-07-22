import { addRoute, createRouter, findRoute, type RouterContext } from "rou3";
import { contextSymbol, methodSymbol, nameSymbol, pathSymbol, universalSymbol } from "./const";
import { pipe } from "./pipe";
import type {
  Enhance,
  EnhancedMiddleware,
  UniversalHandler,
  UniversalMiddleware,
  UniversalRouterInterface,
} from "./types";
import { getUniversal, getUniversalProp, isHandler, ordered, url } from "./utils";

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

  applyCatchAll() {
    if (this.#handle404) {
      for (const method of ["GET", "POST", "PATCH"]) {
        addRoute(this.router, method, "/**", () => {
          return new Response("NOT FOUND", {
            status: 404,
          });
        });
      }
    }
    return this;
  }

  get [universalSymbol](): UniversalMiddleware {
    const noCastPipe = pipe.bind({ noCast: true });
    return (request, ctx, runtime) => {
      const router = findRoute(this.router, request.method, url(request).pathname);

      if (router) {
        const routerCtx = getUniversalProp(router.data, contextSymbol);
        if (routerCtx) {
          Object.assign(ctx, routerCtx);
        }
        const handler =
          this.#pipeMiddlewaresInUniversalRoute && this.#middlewares.length > 0
            ? // biome-ignore lint/suspicious/noExplicitAny: <explanation>
              (noCastPipe(...(this.#middlewares as any[]), router.data) as UniversalHandler)
            : router.data;
        if (router.params) {
          runtime.params ??= {};
          Object.assign(runtime.params, router.params);
        }
        return handler(request, ctx, runtime);
      }
      if (this.#pipeMiddlewaresInUniversalRoute && this.#middlewares.length > 0) {
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        const middlewares = noCastPipe(...(this.#middlewares as any[])) as UniversalMiddleware;
        return middlewares(request, ctx, runtime);
      }
      if (this.#handle404) {
        return new Response("NOT FOUND", {
          status: 404,
        });
      }
    };
  }
}

// TODO handle path for middlewares
export function apply(router: UniversalRouterInterface, middlewares: EnhancedMiddleware[], defer?: boolean) {
  const ms = ordered(middlewares);

  for (const m of ms) {
    if (isHandler(m)) {
      router.route(m);
    } else {
      router.use(m);
    }
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
  const ms = ordered(middlewares);

  for (const m of ms) {
    if (isHandler(m)) {
      await router.route(m);
    } else {
      await router.use(m);
    }
  }
  if (!defer) {
    await router.applyCatchAll();
  }
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
