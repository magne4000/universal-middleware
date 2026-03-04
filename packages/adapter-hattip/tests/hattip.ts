import { cors } from "@hattip/cors";
import { createRouter } from "@hattip/router";
import {
  enhancedMiddlewares,
  guarded,
  handler,
  middlewares,
  routeParamHandler,
  streamCancelHandler,
  streamCancelStatusHandler,
  throwEarlyAndLateHandler,
  throwEarlyHandler,
  throwLateHandler,
} from "@universal-middleware/tests/utils";
import { apply, createHandler, createMiddleware } from "../src/index.js";

const app = createRouter();

// standard hattip middleware
app.use(cors());

const TEST_CASE = globalThis.process?.env?.TEST_CASE;

switch (TEST_CASE) {
  case "router": {
    apply(app, [
      middlewares.throwEarly,
      middlewares.throwLate,
      middlewares.guard,
      middlewares.contextSync,
      middlewares.updateHeaders,
      middlewares.contextAsync,
      routeParamHandler(),
      streamCancelHandler(),
      streamCancelStatusHandler(),
      handler(),
    ]);

    // Test registering /guarded manually to see if `guard` middleware still applies
    app.get("/guarded", createHandler(guarded)());
    app.get("/throw-early", createHandler(throwEarlyHandler)());
    app.get("/throw-late", createHandler(throwLateHandler)());
    app.get("/throw-early-and-late", createHandler(throwEarlyAndLateHandler)());

    break;
  }
  case "router_enhanced": {
    apply(app, [
      routeParamHandler(),
      throwEarlyHandler(),
      throwLateHandler(),
      throwEarlyAndLateHandler(),
      guarded(),
      streamCancelHandler(),
      streamCancelStatusHandler(),
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
    app.use(createMiddleware(() => middlewares.throwEarly)());
    app.use(createMiddleware(() => middlewares.throwLate)());
    app.use(createMiddleware(() => middlewares.guard)());
    app.use(createMiddleware(() => middlewares.contextSync)());
    app.use(createMiddleware(() => middlewares.updateHeaders)());
    app.use(createMiddleware(() => middlewares.contextAsync)());
    app.get("/user/:name", createHandler(routeParamHandler)());
    app.get("/guarded", createHandler(guarded)());
    app.get("/throw-early", createHandler(throwEarlyHandler)());
    app.get("/throw-late", createHandler(throwLateHandler)());
    app.get("/throw-early-and-late", createHandler(throwEarlyAndLateHandler)());
    app.get("/stream-cancel", createHandler(streamCancelHandler)());
    app.get("/stream-cancel-status", createHandler(streamCancelStatusHandler)());
    app.get("/", createHandler(handler)());
  }
}

export default app.buildHandler();
