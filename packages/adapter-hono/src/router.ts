import {
  type DecoratedMiddleware,
  type UniversalHandler,
  UniversalRouter,
  type UniversalRouterInterface,
  apply as applyCore,
  getUniversal,
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

  use(middleware: DecoratedMiddleware) {
    this.#app.use(createMiddleware(() => getUniversal(middleware))());
    return this;
  }

  // route(handler: DecoratedMiddleware) {
  //   const { path, method } = assertRoute(handler);
  //   const umHandler = getUniversal(handler);
  //
  //   this.#app[method.toLocaleLowerCase() as Lowercase<HttpMethod>](
  //     path,
  //     createHandlerHono(() => umHandler as UniversalHandler)(),
  //   );
  //   return this;
  // }

  applyCatchAll() {
    this.#app.all("/*", createHandler(() => this[universalSymbol] as UniversalHandler)());
  }
}

export function apply(app: Hono, middlewares: DecoratedMiddleware[]) {
  const router = new UniversalHonoRouter(app);
  applyCore(router, middlewares);
}
