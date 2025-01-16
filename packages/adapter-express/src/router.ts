import {
  apply as applyCore,
  type EnhancedMiddleware,
  getUniversal,
  type UniversalHandler,
  UniversalRouter,
  type UniversalRouterInterface,
  universalSymbol,
} from "@universal-middleware/core";
import type { Express } from "express";
import { createHandler, createMiddleware } from "./common";

export class UniversalExpressRouter extends UniversalRouter implements UniversalRouterInterface {
  #app: Express;

  constructor(app: Express) {
    super(false);
    this.#app = app;
  }

  use(middleware: EnhancedMiddleware) {
    this.#app.use(createMiddleware(() => getUniversal(middleware))());
    return this;
  }

  applyCatchAll() {
    this.#app.all("/**", createHandler(() => this[universalSymbol] as UniversalHandler)());
    return this;
  }
}

export function apply(app: Express, middlewares: EnhancedMiddleware[]) {
  const router = new UniversalExpressRouter(app);
  applyCore(router, middlewares);
}
