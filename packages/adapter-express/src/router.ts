import {
  apply as applyCore,
  type EnhancedMiddleware,
  getUniversal,
  type UniversalHandler,
  UniversalRouter,
  type UniversalRouterInterface,
  universalSymbol,
} from "@universal-middleware/core";
import { createHandler, createMiddleware } from "./common";
import type { Express } from "./utils";

export type App = Express;

type EnhancedMiddlewareExpress =
  | EnhancedMiddleware
  | EnhancedMiddleware<Universal.Context, Universal.Context, "express">;

export class UniversalExpressRouter<T extends App> extends UniversalRouter implements UniversalRouterInterface {
  #app: T;

  constructor(app: T) {
    super(false);
    this.#app = app;
  }

  use(middleware: EnhancedMiddlewareExpress) {
    this.#app.use(createMiddleware(() => getUniversal(middleware as EnhancedMiddleware))());
    return this;
  }

  applyCatchAll() {
    const handler = createHandler(() => this[universalSymbol] as UniversalHandler)();
    // https://expressjs.com/en/guide/migrating-5.html#app.del
    this.#app.all("del" in this.#app ? "/**" : "/{*catchAll}", handler);
    return this;
  }
}

export function apply(app: Express, middlewares: EnhancedMiddlewareExpress[]) {
  const router = new UniversalExpressRouter(app);
  applyCore(router, middlewares as EnhancedMiddleware[], true);
  // defer
  Promise.resolve().then(() => router.applyCatchAll());
}
