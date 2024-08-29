import { createHandler, createMiddleware } from "../src/index.js";
import fastify from "fastify";
import { args } from "@universal-middleware/tests";
import { handler, middlewares } from "@universal-middleware/tests/utils";
import type { Get, UniversalMiddleware } from "@universal-middleware/core";
import helmet from "@fastify/helmet";

const app = fastify();

await app.register(helmet);

for (const middleware of middlewares) {
  await app.register(
    createMiddleware(middleware as Get<[], UniversalMiddleware>)(),
  );
}

// universal handler
app.get("/", createHandler(handler)());

await app.ready();

const port = args.port ? parseInt(args.port) : 3000;

app.listen({ port, host: "localhost" }, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
