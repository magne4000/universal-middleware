import { cors } from "@hattip/cors";
import { createRouter } from "@hattip/router";
import {
  enhancedMiddlewares,
  guarded,
  handler,
  middlewares,
  routeParamHandler
} from "@universal-middleware/tests/utils";
import { apply, createHandler, createMiddleware } from "../src/index.js";

const app = createRouter();

// standard hattip middleware
app.use(cors());

const TEST_CASE = globalThis.process?.env?.TEST_CASE;

switch (TEST_CASE) {
  case "router": {
    apply(app, [
      middlewares.guard,
      middlewares.contextSync,
      middlewares.updateHeaders,
      middlewares.contextAsync,
      routeParamHandler(),
      handler(),
    ]);

    // Test registering /guarded manually to see if `guard` middleware still applies
    app.get("/guarded", createHandler(guarded)());

    break;
  }
  case "router_enhanced": {
    apply(app, [
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
    app.use(createMiddleware(() => middlewares.guard)());
    app.use(createMiddleware(() => middlewares.contextSync)());
    app.use(createMiddleware(() => middlewares.updateHeaders)());
    app.use(createMiddleware(() => middlewares.contextAsync)());
    app.get("/user/:name", createHandler(routeParamHandler)());
    app.get("/guarded", createHandler(guarded)());
    app.get("/", createHandler(handler)());
  }
}

export default app.buildHandler();
