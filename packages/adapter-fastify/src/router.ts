import {
  apply as applyCore,
  type EnhancedMiddleware,
  getUniversal,
  type UniversalHandler,
  UniversalRouter,
  type UniversalRouterInterface,
  universalSymbol,
} from "@universal-middleware/core";
import type { FastifyInstance } from "fastify";
import { createHandler, createMiddleware } from "./common";

export class UniversalFastifyRouter extends UniversalRouter implements UniversalRouterInterface<"async"> {
  #app: FastifyInstance;

  constructor(app: FastifyInstance) {
    super(false);
    this.#app = app;
  }

  // @ts-ignore ReturnType mismatch with UniversalRouter
  async use(middleware: EnhancedMiddleware) {
    this.#app.register(createMiddleware(() => getUniversal(middleware))());
    return this;
  }

  // @ts-ignore ReturnType mismatch with UniversalRouter
  async applyCatchAll() {
    this.#app.all("/*", createHandler(() => this[universalSymbol] as UniversalHandler)());
    return this;
  }
}

export function apply(app: FastifyInstance, middlewares: EnhancedMiddleware[]) {
  const router = new UniversalFastifyRouter(app);
  return applyCore(router, middlewares, true);
}
