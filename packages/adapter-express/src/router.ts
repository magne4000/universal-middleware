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
    (this.#app as Express5).use(createMiddleware(() => getUniversal(middleware as EnhancedMiddleware))());
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

export function apply(app: Express, middlewares: EnhancedMiddlewareExpress[]) {
  const router = new UniversalExpressRouter(app);
  applyCore(router, middlewares as EnhancedMiddleware[], true);
  // defer
  Promise.resolve().then(() => router.applyCatchAll());
}
