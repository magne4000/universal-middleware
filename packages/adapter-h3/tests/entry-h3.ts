import { args } from "@universal-middleware/tests";
import {
  enhancedMiddlewares,
  guarded,
  handler,
  middlewares,
  routeParamHandler,
  ruleHandler,
  ruleMiddlewares,
  streamCancelHandler,
  streamCancelStatusHandler,
  throwEarlyAndLateHandler,
  throwEarlyHandler,
  throwLateHandler,
} from "@universal-middleware/tests/utils";
import { H3, serve } from "h3";
import { apply, createHandler, createMiddleware } from "../src/index.js";

const app = new H3();

const TEST_CASE = process.env.TEST_CASE;

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
      handler(),
    ]);

    // Test registering /guarded manually to see if `guard` middleware still applies
    app.use("/guarded", createHandler(guarded)());
    app.use("/throw-early", createHandler(throwEarlyHandler)());
    app.use("/throw-late", createHandler(throwLateHandler)());
    app.use("/throw-early-and-late", createHandler(throwEarlyAndLateHandler)());
    app.use("/stream-cancel", createHandler(streamCancelHandler)());
    app.use("/stream-cancel-status", createHandler(streamCancelStatusHandler)());

    break;
  }
  case "router_enhanced": {
    apply(app, [
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
      ...ruleMiddlewares,
      ruleHandler(),
    ]);

    app.use("/stream-cancel", createHandler(streamCancelHandler)());
    app.use("/stream-cancel-status", createHandler(streamCancelStatusHandler)());

    break;
  }
  default: {
    const router = new H3();
    app.use(createMiddleware(() => middlewares.throwEarly)());
    app.use(createMiddleware(() => middlewares.throwLate)());
    app.use(createMiddleware(() => middlewares.guard)());
    app.use(createMiddleware(() => middlewares.contextSync)());
    app.use(createMiddleware(() => middlewares.updateHeaders)());
    app.use(createMiddleware(() => middlewares.contextAsync)());
    router.get("/user/:name", createHandler(routeParamHandler)());
    router.get("/guarded", createHandler(guarded)());
    router.get("/throw-early", createHandler(throwEarlyHandler)());
    router.get("/throw-late", createHandler(throwLateHandler)());
    router.get("/throw-early-and-late", createHandler(throwEarlyAndLateHandler)());
    router.get("/", createHandler(handler)());
    app.use(router);
    app.use("/stream-cancel", createHandler(streamCancelHandler)());
    app.use("/stream-cancel-status", createHandler(streamCancelStatusHandler)());
  }
}

const port = args.port ? Number.parseInt(args.port, 10) : 3000;

serve(app, { port, hostname: "localhost" });
