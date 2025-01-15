import { addRoute, createRouter, findRoute, type RouterContext } from "rou3";
import { methodSymbol, nameSymbol, optionsToSymbols, pathSymbol, universalSymbol } from "./const";
import { pipe } from "./pipe";
import type {
  AnyFn,
  EnhancedMiddleware,
  UniversalHandler,
  UniversalMiddleware,
  UniversalOptions,
  UniversalOptionsArg,
  UniversalRouterInterface,
  WithUniversalSymbols,
} from "./types";
import { cloneFunction, getUniversal, getUniversalProp, ordered, url } from "./utils";

export function enhance<F extends AnyFn, O extends UniversalOptionsArg>(
  middleware: F,
  options: O,
): F & WithUniversalSymbols<O> {
  const { immutable, ...rest } = options;
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  const m: any = immutable === false ? middleware : cloneFunction(middleware);
  for (const [key, value] of Object.entries(rest)) {
    if (key in optionsToSymbols) {
      m[optionsToSymbols[key as keyof UniversalOptions]] = value;
    }
  }
  return m;
}

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

export function apply(router: UniversalRouterInterface, middlewares: EnhancedMiddleware[]): void;
export function apply(
  router: UniversalRouterInterface<"async">,
  middlewares: EnhancedMiddleware[],
  async: true,
): Promise<void>;
export function apply<T extends "sync" | "async" = "sync">(
  router: UniversalRouterInterface<T>,
  middlewares: EnhancedMiddleware[],
  async?: boolean,
) {
  const ms = ordered(middlewares);

  if (async) {
    return (async () => {
      for (const m of ms) {
        if (getUniversalProp(m, pathSymbol)) {
          await router.route(m);
        } else {
          await router.use(m);
        }
      }
      await router.applyCatchAll();
    })();
  }
  for (const m of ms) {
    if (getUniversalProp(m, pathSymbol)) {
      router.route(m);
    } else {
      router.use(m);
    }
  }
  router.applyCatchAll();
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
