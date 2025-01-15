import { args, bun, deno } from "@universal-middleware/tests";
import {
  enhancedMiddlewares,
  guarded,
  handler,
  middlewares,
  routeParamHandler,
} from "@universal-middleware/tests/utils";
import { createApp, createRouter, toNodeListener, toWebHandler } from "h3";
import { apply, createHandler, createMiddleware, universalOnBeforeResponse } from "../src/index.js";

const app = createApp();

const TEST_CASE = process.env.TEST_CASE;

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
    app.use("/guarded", createHandler(guarded)());

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
    app.options.onBeforeResponse = universalOnBeforeResponse;
    const router = createRouter();
    app.use(createMiddleware(() => middlewares.guard)());
    app.use(createMiddleware(() => middlewares.contextSync)());
    app.use(createMiddleware(() => middlewares.updateHeaders)());
    app.use(createMiddleware(() => middlewares.contextAsync)());
    router.get("/user/:name", createHandler(routeParamHandler)());
    router.get("/guarded", createHandler(guarded)());
    router.get("/", createHandler(handler)());
    app.use(router);
  }
}

const port = args.port ? Number.parseInt(args.port) : 3000;

if (deno) {
  // @ts-ignore
  Deno.serve(
    {
      port,
      onListen() {
        console.log(`Server listening on http://localhost:${port}`);
      },
    },
    toWebHandler(app),
  );
} else if (!bun) {
  const { createServer } = await import("node:http");
  createServer(toNodeListener(app)).listen(port, "localhost", () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
}

// Bun
export default {
  port,
  fetch: toWebHandler(app),
};
