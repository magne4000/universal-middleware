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

// biome-ignore lint/suspicious/noExplicitAny: ignored
export type App = Hono<any, any, any>;

export class UniversalHonoRouter extends UniversalRouter implements UniversalRouterInterface {
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
    this.#app.all("/*", createHandler(() => this[universalSymbol] as UniversalHandler)());
    return this;
  }
}

export function apply(app: App, middlewares: EnhancedMiddleware[]) {
  const router = new UniversalHonoRouter(app);
  applyCore(router, middlewares);
}
