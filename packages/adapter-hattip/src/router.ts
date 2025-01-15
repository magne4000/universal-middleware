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

export class UniversalHattipRouter extends UniversalRouter implements UniversalRouterInterface {
  #app: Router;

  constructor(app: Router) {
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

export function apply(app: Router, middlewares: EnhancedMiddleware[]) {
  const router = new UniversalHattipRouter(app);
  applyCore(router, middlewares);
}
