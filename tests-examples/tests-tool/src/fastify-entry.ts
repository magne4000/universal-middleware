import handler from "@universal-middleware-examples/tool/dummy-handler-fastify";
import contextMiddleware from "@universal-middleware-examples/tool/middlewares/context-middleware-fastify";
import headersMiddleware from "@universal-middleware-examples/tool/middlewares/headers-middleware-fastify";
import paramsHandler from "@universal-middleware-examples/tool/params-handler-fastify";
import compress from "@universal-middleware/compress/fastify";
import fastify from "fastify";
import rawBody from "fastify-raw-body";
import { args } from "./utils";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const _dirname = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url));

const app = fastify();

// /!\ Mandatory if you need to access the request body in any Universal Middleware or Handler
await app.register(rawBody);

// Now the universal context contains `{ hello: "World!!!" }`.
// See /examples/context-middleware
app.register(contextMiddleware("World!!!"));

// After a Response has been returned by the handler below,
// the `{ "X-Universal-Hello": "World!!!" }` header is appended to it
app.register(headersMiddleware());

app.register(compress());

app.get("/user/:name", paramsHandler());

app.get("/compression", (request, reply) => {
  const context = readFileSync(join(_dirname, "..", "public", "big-file.txt"), "utf-8");
  reply.status(200).send(context);
});

app.get("/", handler());

const port = args.port ? Number.parseInt(args.port) : 3000;

app.listen(
  {
    port,
    host: "localhost",
  },
  () => {
    console.log(`Server listening on http://localhost:${port}`);
  },
);
