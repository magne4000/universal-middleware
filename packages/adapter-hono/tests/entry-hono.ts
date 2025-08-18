import { args, bun, deno } from "@universal-middleware/tests";
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
import { Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";
import { apply, createHandler, createMiddleware } from "../src/index.js";

const app = new Hono();

// standard Hono middleware
app.use(secureHeaders());

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
    app.get("/", createHandler(handler)());
  }
}

const port = args.port ? Number.parseInt(args.port, 10) : 3000;

if (deno) {
  // @ts-expect-error Deno
  Deno.serve(
    {
      port,
      onListen() {
        console.log(`Server listening on http://localhost:${port}`);
      },
    },
    app.fetch,
  );
} else if (!bun) {
  const { serve } = await import("@hono/node-server");
  serve(
    {
      fetch: app.fetch,
      port,
    },
    () => {
      console.log(`Server listening on http://localhost:${port}`);
    },
  );
}

// Bun
export default {
  port,
  fetch: app.fetch,
};
