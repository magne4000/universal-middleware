import { type RouterContext, addRoute, createRouter, findRoute } from "rou3";
import { methodSymbol, optionsToSymbols, orderSymbol, pathSymbol, universalSymbol } from "./const";
import { pipe } from "./pipe";
import type {
  AnyFn,
  DecoratedMiddleware,
  UniversalHandler,
  UniversalMiddleware,
  UniversalOptions,
  UniversalOptionsArg,
  UniversalRouterInterface,
  WithUniversalSymbols,
} from "./types";
import { cloneFunction, getUniversal, getUniversalProp } from "./utils";

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

function ordered(middlewares: DecoratedMiddleware[]) {
  return Array.from(middlewares).sort(
    (a, b) => (getUniversalProp(a, orderSymbol) ?? 0) - (getUniversalProp(b, orderSymbol) ?? 0),
  );
}
