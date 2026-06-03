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
import { createHandler, createMiddleware } from "./common";

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
  // Reading `context.body` in our middleware/handler makes Elysia's sucrose
  // inference eagerly parse the request body. Reconstructing the request from
  // that parsed value is lossy: JSON primitives (`"x"`, `42`, `true`) arrive
  // to downstream handlers without their JSON encoding, breaking any handler
  // that reads the raw body (e.g. tRPC). Forward the raw bytes instead so the
  // original payload is preserved. Bodyless methods are guarded so GET/HEAD
  // aren't given an empty body (cloning an ArrayBuffer onto a GET Request throws).
  app.onParse((ctx) =>
    ctx.request.method !== "GET" && ctx.request.method !== "HEAD" ? ctx.request.arrayBuffer() : undefined,
  );
  const router = new UniversalElysiaRouter(app);
  applyCore(router, middlewares as EnhancedMiddleware[]);
}
