import {
  apply as applyCore,
  type EnhancedMiddleware,
  getUniversal,
  type UniversalHandler,
  UniversalRouter,
  type UniversalRouterInterface,
  universalSymbol,
} from "@universal-middleware/core";
import type { App } from "h3";
import { createHandler, createMiddleware, universalOnBeforeResponse } from "./common";

export type { App };

type EnhancedMiddlewareH3 = EnhancedMiddleware | EnhancedMiddleware<Universal.Context, Universal.Context, "h3">;

export class UniversalH3Router extends UniversalRouter implements UniversalRouterInterface {
  #app: App;

  constructor(app: App) {
    super(false);
    this.#app = app;
  }

  use(middleware: EnhancedMiddlewareH3) {
    this.#app.use(createMiddleware(() => getUniversal(middleware as EnhancedMiddleware))());
    return this;
  }

  applyCatchAll() {
    this.#app.use(createHandler(() => this[universalSymbol] as UniversalHandler)());
    return this;
  }
}

export function apply(app: App, middlewares: EnhancedMiddlewareH3[]) {
  app.options.onBeforeResponse = universalOnBeforeResponse;
  const router = new UniversalH3Router(app);
  applyCore(router, middlewares as EnhancedMiddleware[]);
}
