import {
  apply as applyCore,
  type EnhancedMiddleware,
  getUniversal,
  type UniversalHandler,
  UniversalRouter,
  type UniversalRouterInterface,
  universalSymbol,
} from "@universal-middleware/core";
import type { Hono } from "hono";
import { createHandler, createMiddleware } from "./common";

export class UniversalHonoRouter extends UniversalRouter implements UniversalRouterInterface {
  #app: Hono;

  constructor(app: Hono) {
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

export function apply(app: Hono, middlewares: EnhancedMiddleware[]) {
  const router = new UniversalHonoRouter(app);
  applyCore(router, middlewares);
}
