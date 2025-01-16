import { pipe, type UniversalHandler, UniversalRouter, universalSymbol } from "@universal-middleware/core";
import {
  enhancedMiddlewares,
  guarded,
  handler,
  middlewares,
  routeParamHandler,
} from "@universal-middleware/tests/utils";
import { apply, type CloudflareHandler, createHandler } from "../src/index.js";

const routeParamHandlerInstance = routeParamHandler({
  route: "/user/:name",
});

let catchAllHandler: CloudflareHandler<Universal.Context>;

// Defined through --define cli option
declare const TEST_CASE: string;

switch (TEST_CASE) {
  case "router": {
    catchAllHandler = apply([
      middlewares.guard,
      middlewares.contextSync,
      middlewares.updateHeaders,
      middlewares.contextAsync,
      routeParamHandler(),
      handler(),
      guarded(),
    ]);

    break;
  }
  case "router_enhanced": {
    catchAllHandler = apply([
      routeParamHandler(),
      guarded(),
      handler(),
      enhancedMiddlewares.contextSync,
      enhancedMiddlewares.updateHeaders,
      enhancedMiddlewares.contextAsync,
      enhancedMiddlewares.guard,
    ]);

    break;
  }
  default: {
    catchAllHandler = createHandler(
      () =>
        pipe(
          middlewares.guard,
          middlewares.contextSync,
          middlewares.updateHeaders,
          middlewares.contextAsync,
          new UniversalRouter(false, true).route(routeParamHandler()).route(guarded()).route(handler()).applyCatchAll()[
            universalSymbol
          ],
        ) as UniversalHandler,
    )();
  }
}

export default catchAllHandler;
