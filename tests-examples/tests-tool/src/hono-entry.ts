import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";
import compress from "@universal-middleware/compress/hono";
import { createHandler } from "@universal-middleware/hono";
import { sendBigFile } from "@universal-middleware/tests/utils-node";
import handler from "@universal-middleware-examples/tool/dummy-handler-hono";
import contextMiddleware from "@universal-middleware-examples/tool/middlewares/context-middleware-hono";
import headersMiddleware from "@universal-middleware-examples/tool/middlewares/headers-middleware-hono";
import paramsHandler from "@universal-middleware-examples/tool/params-handler-hono";
import { Hono } from "hono";
import { args } from "./utils";

const _dirname = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url));

const app = new Hono();

// Now the universal context contains `{ hello: "World!!!" }`.
// See /examples/context-middleware
app.use(contextMiddleware("World!!!"));

// After a Response has been returned by the handler below,
// the `{ "X-Universal-Hello": "World!!!" }` header is appended to it
app.use(headersMiddleware());

app.use(compress());

app.get("/user/:name", paramsHandler());

app.get("/big-file", createHandler(sendBigFile)());

app.get("/", handler());

if (process.env.NODE_ENV === "production") {
  const port = args.port ? Number.parseInt(args.port, 10) : 3000;
  serve(
    {
      ...app,
      port,
    },
    () => {
      console.log(`Server listening on http://localhost:${port}`);
    },
  );
}

export default app;
