import helmet from "@fastify/helmet";
import { enhance, type UniversalHandler } from "@universal-middleware/core";
import { args } from "@universal-middleware/tests";
import {
  enhancedMiddlewares,
  guarded,
  handler,
  middlewares,
  routeParamHandler,
} from "@universal-middleware/tests/utils";
import fastify from "fastify";
import rawBody from "fastify-raw-body";
import { apply, createHandler, createMiddleware } from "../src/index.js";

const app = fastify();

await app.register(helmet);

// Mandatory if you need to access the request body in any Universal Middleware or Handler
await app.register(rawBody);

const post = (async (request) => {
  const req = await request.json();

  return new Response(JSON.stringify({ ok: req.something }), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
  });
}) satisfies UniversalHandler;

const TEST_CASE = process.env.TEST_CASE;

switch (TEST_CASE) {
  case "router": {
    await apply(app, [
      middlewares.guard,
      middlewares.contextSync,
      middlewares.updateHeaders,
      middlewares.contextAsync,
      routeParamHandler(),
      handler(),
      enhance(post, {
        method: "POST",
        path: "/post",
      }),
    ]);

    // Test registering /guarded manually to see if `guard` middleware still applies
    app.get("/guarded", createHandler(guarded)());

    break;
  }
  case "router_enhanced": {
    await apply(app, [
      routeParamHandler(),
      guarded(),
      handler(),
      enhance(post, {
        method: "POST",
        path: "/post",
      }),
      enhancedMiddlewares.contextSync,
      enhancedMiddlewares.updateHeaders,
      enhancedMiddlewares.contextAsync,
      enhancedMiddlewares.guard,
    ]);

    break;
  }
  default: {
    await app.register(createMiddleware(() => middlewares.guard)());
    await app.register(createMiddleware(() => middlewares.contextSync)());
    await app.register(createMiddleware(() => middlewares.updateHeaders)());
    await app.register(createMiddleware(() => middlewares.contextAsync)());
    app.get("/user/:name", createHandler(routeParamHandler)());
    app.get("/guarded", createHandler(guarded)());
    app.get("/", createHandler(handler)());
    app.post("/post", createHandler(() => post)());
  }
}

await app.ready();

const port = args.port ? Number.parseInt(args.port) : 3000;

app.listen({ port, host: "localhost" }, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
