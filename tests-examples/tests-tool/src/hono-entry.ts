import { Hono } from "hono";
import contextMiddleware from "@universal-middleware-examples/tool/middlewares/context-middleware-hono";
import headersMiddleware from "@universal-middleware-examples/tool/middlewares/headers-middleware-hono";
import handler from "@universal-middleware-examples/tool/dummy-handler-hono";

const app = new Hono();

// Now the universal context contains `{ hello: "World!!!" }`.
// See /examples/context-middleware
app.use(contextMiddleware("World!!!"));

// After a Response has been returned by the handler below,
// the `{ "X-Universal-Hello": "World!!!" }` header is appended to it
app.use(headersMiddleware());

app.get("/", handler());

export default app;
