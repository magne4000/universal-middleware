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
import type { Router } from "@hattip/router";

export type App = Router;

export class UniversalHattipRouter extends UniversalRouter implements UniversalRouterInterface {
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
    this.#app.use("/*", createHandler(() => this[universalSymbol] as UniversalHandler)());
    return this;
  }
}

export function apply(app: App, middlewares: EnhancedMiddleware[]) {
  const router = new UniversalHattipRouter(app);
  applyCore(router, middlewares);
}
