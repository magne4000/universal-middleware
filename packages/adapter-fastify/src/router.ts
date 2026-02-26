import {
  applyAsync as applyAsyncCore,
  type EnhancedMiddleware,
  getUniversal,
  type UniversalHandler,
  UniversalRouter,
  type UniversalRouterInterface,
  universalSymbol,
} from "@universal-middleware/core";
import type { FastifyInstance } from "fastify";
import { createHandler, createMiddleware } from "./common";

export type App = FastifyInstance;

type EnhancedMiddlewareFastify =
  | EnhancedMiddleware
  | EnhancedMiddleware<Universal.Context, Universal.Context, "fastify">;

export class UniversalFastifyRouter extends UniversalRouter implements UniversalRouterInterface<"async"> {
  #app: App;

  constructor(app: App) {
    super(false);
    this.#app = app;
  }

  // @ts-expect-error ReturnType mismatch with UniversalRouter
  async use(middleware: EnhancedMiddlewareFastify) {
    this.#app.register(createMiddleware(() => getUniversal(middleware as EnhancedMiddleware))());
    return this;
  }

  // @ts-expect-error ReturnType mismatch with UniversalRouter
  async applyCatchAll() {
    this.#app.all("/*", createHandler(() => this[universalSymbol] as UniversalHandler)());
    return this;
  }
}

export function apply(app: App, middlewares: EnhancedMiddlewareFastify[]) {
  const router = new UniversalFastifyRouter(app);
  return applyAsyncCore(router, middlewares as EnhancedMiddleware[]);
}
