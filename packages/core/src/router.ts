import { addRoute, createRouter, findRoute, type RouterContext } from "rou3";
import { methodSymbol, nameSymbol, orderSymbol, pathSymbol, universalSymbol } from "./const";
import { pipe } from "./pipe";
import type { EnhancedMiddleware, UniversalHandler, UniversalMiddleware, UniversalRouterInterface, } from "./types";
import { getUniversal, getUniversalProp, ordered, url } from "./utils";

export class UniversalRouter implements UniversalRouterInterface {
  public router: RouterContext<UniversalHandler>;
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

/**
 * A middleware is considered a handler if:
 * - It has an order equal to 0
 * - It has a path and no order
 */
function isHandler(m: EnhancedMiddleware) {
  const order = getUniversalProp(m, orderSymbol);
  if (typeof order === "number") {
    return order === 0;
  }
  return Boolean(getUniversalProp(m, pathSymbol));
}

// TODO handle path for middlewares
export function apply(router: UniversalRouterInterface, middlewares: EnhancedMiddleware[]) {
  const ms = ordered(middlewares);

  for (const m of ms) {
    if (isHandler(m)) {
      router.route(m);
    } else {
      router.use(m);
    }
  }
  router.applyCatchAll();
}

export async function applyAsync(router: UniversalRouterInterface<"async">, middlewares: EnhancedMiddleware[]) {
  const ms = ordered(middlewares);

  for (const m of ms) {
    if (isHandler(m)) {
      await router.route(m);
    } else {
      await router.use(m);
    }
  }
  await router.applyCatchAll();
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
