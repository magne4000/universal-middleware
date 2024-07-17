import { Hono } from "hono";
import contextMiddleware from "@universal-middleware-examples/tool/middlewares/context-middleware-hono";
import headersMiddleware from "@universal-middleware-examples/tool/middlewares/headers-middleware-hono";
import handler from "@universal-middleware-examples/tool/dummy-handler-hono";

const app = new Hono();

app.use(contextMiddleware);
app.use(headersMiddleware);
app.get("/", handler);

export default app;
