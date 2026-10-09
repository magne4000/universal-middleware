import {
  apply as applyCore,
  type EnhancedMiddleware,
  getUniversal,
  type UniversalHandler,
  UniversalRouter,
  type UniversalRouterInterface,
  universalSymbol,
} from "@universal-middleware/core";
import { createHandler, createMiddleware } from "./common.js";
import type { NodeAdapterHandlerOptions, NodeAdapterMiddlewareOptions } from "./types.js";
import type { Express } from "./utils.js";

export type App = Express;

/** The options `apply` passes to every middleware and handler it adapts */
type ApplyOptions = NodeAdapterHandlerOptions & NodeAdapterMiddlewareOptions;

type EnhancedMiddlewareExpress =
  | EnhancedMiddleware
  | EnhancedMiddleware<Universal.Context, Universal.Context, "express">;

export class UniversalExpressRouter<T extends App> extends UniversalRouter implements UniversalRouterInterface {
  #app: T;
  #options: ApplyOptions;

  constructor(app: T, options: ApplyOptions = {}) {
    super(false);
    this.#app = app;
    this.#options = options;
  }

  use(middleware: EnhancedMiddlewareExpress) {
    this.#app.use(createMiddleware(() => getUniversal(middleware as EnhancedMiddleware), this.#options)());
    return this;
  }

  applyCatchAll() {
    const handler = createHandler(() => this[universalSymbol] as UniversalHandler, this.#options)();
    // https://expressjs.com/en/guide/migrating-5.html#app.del
    this.#app.all("del" in this.#app ? "/**" : "/{*catchAll}", handler);
    return this;
  }
}

export function apply(app: Express, middlewares: EnhancedMiddlewareExpress[], options?: ApplyOptions) {
  const router = new UniversalExpressRouter(app, options);
  applyCore(router, middlewares as EnhancedMiddleware[], true);
  // defer
  Promise.resolve().then(() => router.applyCatchAll());
}
