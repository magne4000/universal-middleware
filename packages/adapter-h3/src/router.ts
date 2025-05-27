import {
  apply as applyCore,
  type EnhancedMiddleware,
  getUniversal,
  type UniversalHandler,
  UniversalRouter,
  type UniversalRouterInterface,
  universalSymbol,
} from "@universal-middleware/core";
import { createHandler, createMiddleware, universalOnBeforeResponse } from "./common";
import type { App } from "h3";

export type { App };

export class UniversalH3Router extends UniversalRouter implements UniversalRouterInterface {
  #app: App;

  constructor(app: App) {
    super(false);
    this.#app = app;
  }

  use(middleware: EnhancedMiddleware) {
    this.#app.use(createMiddleware(() => getUniversal(middleware))());
    return this;
  }

  applyCatchAll() {
    this.#app.use(createHandler(() => this[universalSymbol] as UniversalHandler)());
    return this;
  }
}

export function apply(app: App, middlewares: EnhancedMiddleware[]) {
  app.options.onBeforeResponse = universalOnBeforeResponse;
  const router = new UniversalH3Router(app);
  applyCore(router, middlewares);
}
