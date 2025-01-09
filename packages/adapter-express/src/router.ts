import {
  type DecoratedMiddleware,
  type UniversalHandler,
  UniversalRouter,
  type UniversalRouterInterface,
  apply as applyCore,
  getUniversal,
  universalSymbol,
} from "@universal-middleware/core";
import type { Express } from "express";
import { createHandler, createMiddleware } from "./common";

export class UniversalExpressRouter extends UniversalRouter implements UniversalRouterInterface {
  #app: Express;

  constructor(app: Express) {
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
  //     createHandlerExpress(() => umHandler as UniversalHandler)(),
  //   );
  //   return this;
  // }

  applyCatchAll() {
    this.#app.all("/**", createHandler(() => this[universalSymbol] as UniversalHandler)());
  }
}

// TODO check if a user adds a route manually, before catch-all,
//      does this route call all middlewares? (they are declared AFTER, so probably server dependant?)
//      If not, some server `apply` function would need to be split into 2 funtions,
//      not calling `applyCatchAll` in the first one, and the second one only calling it.
//      Another solution could be to have a router.pipe(serverHandler) function to wrap a server handler with all
//      middlewares declared in `router`.
export function apply(app: Express, middlewares: DecoratedMiddleware[]) {
  const router = new UniversalExpressRouter(app);
  applyCore(router, middlewares);
}
