import {
  apply as applyCore,
  type EnhancedMiddleware,
  getUniversal,
  type UniversalHandler,
  UniversalRouter,
  type UniversalRouterInterface,
  universalSymbol,
} from "@universal-middleware/core";
import type { AnyElysia } from "elysia";
import { captureRequestBody, createHandler, createMiddleware } from "./common";

export type App = AnyElysia;

type EnhancedMiddlewareElysia = EnhancedMiddleware | EnhancedMiddleware<Universal.Context, Universal.Context, "elysia">;

export class UniversalElysiaRouter extends UniversalRouter implements UniversalRouterInterface {
  #app: App;

  constructor(app: App) {
    super(false);
    this.#app = app;
  }

  use(middleware: EnhancedMiddlewareElysia) {
    this.#app.use(createMiddleware(() => getUniversal(middleware as EnhancedMiddleware))());
    return this;
  }

  applyCatchAll() {
    this.#app.all("/*", createHandler(() => this[universalSymbol] as UniversalHandler)());
    return this;
  }
}

export function apply(app: App, middlewares: EnhancedMiddlewareElysia[]) {
  app.onParse((ctx) => captureRequestBody(ctx.request));
  const router = new UniversalElysiaRouter(app);
  applyCore(router, middlewares as EnhancedMiddleware[]);
}
