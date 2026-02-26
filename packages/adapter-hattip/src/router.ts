import type { Router } from "@hattip/router";
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

export type App = Router;

type EnhancedMiddlewareHattip = EnhancedMiddleware | EnhancedMiddleware<Universal.Context, Universal.Context, "hattip">;

export class UniversalHattipRouter extends UniversalRouter implements UniversalRouterInterface {
  #app: App;

  constructor(app: App) {
    super(false);
    this.#app = app;
  }

  use(middleware: EnhancedMiddlewareHattip) {
    this.#app.use(createMiddleware(() => getUniversal(middleware as EnhancedMiddleware))());
    return this;
  }

  applyCatchAll() {
    this.#app.use("/*", createHandler(() => this[universalSymbol] as UniversalHandler)());
    return this;
  }
}

export function apply(app: App, middlewares: EnhancedMiddlewareHattip[]) {
  const router = new UniversalHattipRouter(app);
  applyCore(router, middlewares as EnhancedMiddleware[]);
}
