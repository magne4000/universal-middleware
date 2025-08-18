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

export class UniversalFastifyRouter extends UniversalRouter implements UniversalRouterInterface<"async"> {
  #app: App;

  constructor(app: App) {
    super(false);
    this.#app = app;
  }

  // @ts-expect-error ReturnType mismatch with UniversalRouter
  async use(middleware: EnhancedMiddleware) {
    this.#app.register(createMiddleware(() => getUniversal(middleware))());
    return this;
  }

  // @ts-expect-error ReturnType mismatch with UniversalRouter
  async applyCatchAll() {
    this.#app.all("/*", createHandler(() => this[universalSymbol] as UniversalHandler)());
    return this;
  }
}

export function apply(app: App, middlewares: EnhancedMiddleware[]) {
  const router = new UniversalFastifyRouter(app);
  return applyAsyncCore(router, middlewares);
}
