import helmet from "@fastify/helmet";
import type { Get, UniversalMiddleware } from "@universal-middleware/core";
import { args } from "@universal-middleware/tests";
import { handler, middlewares, routeParamHandler } from "@universal-middleware/tests/utils";
import fastify from "fastify";
import rawBody from "fastify-raw-body";
import { createHandler, createMiddleware } from "../src/index.js";

const app = fastify();

await app.register(helmet);

// Mandatory if you need to access the request body in any Universal Middleware or Handler
await app.register(rawBody);

for (const middleware of middlewares) {
  await app.register(createMiddleware(middleware as Get<[], UniversalMiddleware>)());
}

app.post(
  "/post",
  createHandler(() => async (request) => {
    const req = await request.json();

    return new Response(JSON.stringify({ ok: req.something }), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
      },
    });
  })(),
);

// route params handler
app.get("/user/:name", createHandler(routeParamHandler)());

// universal handler
app.get("/", createHandler(handler)());

await app.ready();

const port = args.port ? Number.parseInt(args.port) : 3000;

app.listen({ port, host: "localhost" }, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
