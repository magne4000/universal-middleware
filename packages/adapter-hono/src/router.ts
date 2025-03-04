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

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
type AnyHono = Hono<any, any, any>;

export class UniversalHonoRouter extends UniversalRouter implements UniversalRouterInterface {
  #app: AnyHono;

  constructor(app: AnyHono) {
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

export function apply(app: AnyHono, middlewares: EnhancedMiddleware[]) {
  const router = new UniversalHonoRouter(app);
  applyCore(router, middlewares);
}
