import { createHandler, createMiddleware } from "../src/index.js";
import fastify from "fastify";
import { args } from "@universal-middleware/tests";
import { handler, middlewares } from "@universal-middleware/tests/utils";
import rawBody from "fastify-raw-body";
import helmet from "@fastify/helmet";
import type { Get, UniversalMiddleware } from "@universal-middleware/core";

const app = fastify();

await app.register(helmet);

// Mandatory if you need to access the request body in any Universal Middleware or Handler
await app.register(rawBody);

for (const middleware of middlewares) {
  await app.register(
    createMiddleware(middleware as Get<[], UniversalMiddleware>)(),
  );
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

// universal handler
app.get("/", createHandler(handler)());

await app.ready();

const port = args.port ? parseInt(args.port) : 3000;

app.listen({ port, host: "localhost" }, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
