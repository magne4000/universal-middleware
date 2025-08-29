import { pipe, type UniversalHandler, UniversalRouter, universalSymbol } from "@universal-middleware/core";
import { args } from "@universal-middleware/tests";
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
import { serve } from "srvx";
import { apply, createHandler, type SrvxHandler } from "../src/index.js";

const TEST_CASE = process.env.TEST_CASE;

let fetchHandler: SrvxHandler<Universal.Context>;

switch (TEST_CASE) {
  case "router": {
    fetchHandler = apply([
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
    fetchHandler = apply([
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
    fetchHandler = createHandler(
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

const port = args.port ? Number.parseInt(args.port, 10) : 3000;

const server = serve({
  fetch: fetchHandler,
  port,
  // The process crashes without a default error handler on Node
  error() {
    return new Response(`Internal Server Error`, {
      status: 500,
    });
  },
});

await server.ready();
