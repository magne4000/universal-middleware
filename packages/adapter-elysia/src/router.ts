import {
  apply as applyCore,
  type EnhancedMiddleware,
  getUniversal,
  type UniversalHandler,
  UniversalRouter,
  type UniversalRouterInterface,
  universalSymbol,
} from "@universal-middleware/core";
import type { Elysia } from "elysia";
import { createHandler, createMiddleware } from "./common";

export class UniversalElysiaRouter extends UniversalRouter implements UniversalRouterInterface {
  #app: Elysia;

  constructor(app: Elysia) {
    super(false);
    this.#app = app;
  }

  use(middleware: EnhancedMiddleware) {
    this.#app.use(createMiddleware(() => getUniversal(middleware))());
    return this;
  }

  applyCatchAll() {
    this.#app.all("/*", createHandler(() => this[universalSymbol] as UniversalHandler)());
    return this;
  }
}

export function apply(app: Elysia, middlewares: EnhancedMiddleware[]) {
  const router = new UniversalElysiaRouter(app);
  applyCore(router, middlewares);
}
