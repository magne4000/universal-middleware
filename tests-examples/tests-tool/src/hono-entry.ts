import handler from "@universal-middleware-examples/tool/dummy-handler-hono";
import contextMiddleware from "@universal-middleware-examples/tool/middlewares/context-middleware-hono";
import headersMiddleware from "@universal-middleware-examples/tool/middlewares/headers-middleware-hono";
import paramsHandler from "@universal-middleware-examples/tool/params-handler-hono";
import compress from "@universal-middleware/compress/hono";
import { Hono } from "hono";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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

app.get("/compression", () => {
  const context = readFileSync(join(_dirname, "..", "public", "big-file.txt"), "utf-8");
  return new Response(context, {
    status: 200,
  });
});

app.get("/", handler());

export default app;
