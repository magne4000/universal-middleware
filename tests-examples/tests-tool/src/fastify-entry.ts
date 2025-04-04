import handler from "@universal-middleware-examples/tool/dummy-handler-fastify";
import contextMiddleware from "@universal-middleware-examples/tool/middlewares/context-middleware-fastify";
import headersMiddleware from "@universal-middleware-examples/tool/middlewares/headers-middleware-fastify";
import paramsHandler from "@universal-middleware-examples/tool/params-handler-fastify";
import compress from "@universal-middleware/compress/fastify";
import fastify from "fastify";
import rawBody from "fastify-raw-body";
import { args } from "./utils";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { sendBigFile } from "@universal-middleware/tests/utils-node";
import { createHandler } from "@universal-middleware/fastify";

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

app.get("/big-file", createHandler(sendBigFile)());

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
