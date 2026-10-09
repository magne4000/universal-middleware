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
import { createHandler, createMiddleware, type FastifyAdapterOptions } from "./common.js";

export type App = FastifyInstance;

type EnhancedMiddlewareFastify =
  | EnhancedMiddleware
  | EnhancedMiddleware<Universal.Context, Universal.Context, "fastify">;

export class UniversalFastifyRouter extends UniversalRouter implements UniversalRouterInterface<"async"> {
  #app: App;
  #options: FastifyAdapterOptions;

  constructor(app: App, options: FastifyAdapterOptions = {}) {
    super(false);
    this.#app = app;
    this.#options = options;
  }

  // @ts-expect-error ReturnType mismatch with UniversalRouter
  async use(middleware: EnhancedMiddlewareFastify) {
    this.#app.register(createMiddleware(() => getUniversal(middleware as EnhancedMiddleware), this.#options)());
    return this;
  }

  // @ts-expect-error ReturnType mismatch with UniversalRouter
  async applyCatchAll() {
    this.#app.all("/*", createHandler(() => this[universalSymbol] as UniversalHandler, this.#options)());
    return this;
  }
}

export function apply(app: App, middlewares: EnhancedMiddlewareFastify[], options?: FastifyAdapterOptions) {
  const router = new UniversalFastifyRouter(app, options);
  return applyAsyncCore(router, middlewares as EnhancedMiddleware[]);
}
