import { pipe, type UniversalHandler, UniversalRouter, universalSymbol } from "@universal-middleware/core";
import {
  enhancedMiddlewares,
  guarded,
  handler,
  middlewares,
  routeParamHandler,
  throwEarlyAndLateHandler,
  throwEarlyHandler,
  throwLateHandler,
} from "@universal-middleware/tests/utils";
import { apply, type CloudflareHandler, createHandler } from "../src/index.js";

let catchAllHandler: CloudflareHandler<Universal.Context>;

// Defined through --define cli option
declare const TEST_CASE: string;

switch (TEST_CASE) {
  case "router": {
    catchAllHandler = apply([
      middlewares.throwEarly,
      middlewares.throwLate,
      middlewares.guard,
      middlewares.contextSync,
      middlewares.updateHeaders,
      middlewares.contextAsync,
      routeParamHandler(),
      handler(),
      guarded(),
      throwEarlyHandler(),
      throwLateHandler(),
      throwEarlyAndLateHandler(),
    ]);

    break;
  }
  case "router_enhanced": {
    catchAllHandler = apply([
      routeParamHandler(),
      throwEarlyHandler(),
      throwLateHandler(),
      throwEarlyAndLateHandler(),
      guarded(),
      handler(),
      enhancedMiddlewares.contextSync,
      enhancedMiddlewares.updateHeaders,
      enhancedMiddlewares.contextAsync,
      enhancedMiddlewares.guard,
      enhancedMiddlewares.throwEarly,
      enhancedMiddlewares.throwLate,
    ]);

    break;
  }
  default: {
    catchAllHandler = createHandler(
      () =>
        pipe(
          middlewares.throwEarly,
          middlewares.throwLate,
          middlewares.guard,
          middlewares.contextSync,
          middlewares.updateHeaders,
          middlewares.contextAsync,
          new UniversalRouter(false, true)
            .route(routeParamHandler())
            .route(guarded())
            .route(handler())
            .route(throwEarlyHandler())
            .route(throwLateHandler())
            .route(throwEarlyAndLateHandler())
            .applyCatchAll()[universalSymbol],
        ) as UniversalHandler,
    )();
  }
}

export default catchAllHandler;
