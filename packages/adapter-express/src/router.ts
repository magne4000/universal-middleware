import {
  apply as applyCore,
  type EnhancedMiddleware,
  getUniversal,
  type UniversalHandler,
  UniversalRouter,
  type UniversalRouterInterface,
  universalSymbol,
} from "@universal-middleware/core";
import type { Express as Express5 } from "express";
import { createHandler, createMiddleware } from "./common";
import { type Express, isExpressV4, isExpressV5 } from "./utils";

export class UniversalExpressRouter<T extends Express> extends UniversalRouter implements UniversalRouterInterface {
  #app: T;

  constructor(app: T) {
    super(false);
    this.#app = app;
  }

  use(middleware: EnhancedMiddleware) {
    (this.#app as Express5).use(createMiddleware(() => getUniversal(middleware))());
    return this;
  }

  applyCatchAll() {
    if (isExpressV5(this.#app)) {
      this.#app.all("/{*catchAll}", createHandler(() => this[universalSymbol] as UniversalHandler)());
    }
    if (isExpressV4(this.#app)) {
      this.#app.all("/**", createHandler(() => this[universalSymbol] as UniversalHandler)());
    }
    return this;
  }
}

export function apply(app: Express, middlewares: EnhancedMiddleware[]) {
  const router = new UniversalExpressRouter(app);
  applyCore(router, middlewares, true);
  // defer
  Promise.resolve().then(() => router.applyCatchAll());
}
