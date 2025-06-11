import { handler, middlewares } from "@universal-middleware/tests/utils";
import { Hono } from "hono";
import { createHandler, createMiddleware } from "@universal-middleware/hono";
import { createEdgeHandler } from "../../../src/hono.js";

const app = new Hono();

app.use(createMiddleware(() => middlewares.guard)());
app.use(createMiddleware(() => middlewares.contextSync)());
app.use(createMiddleware(() => middlewares.updateHeaders)());
app.use(createMiddleware(() => middlewares.contextAsync)());
app.use(createHandler(handler)());

export const GET = createEdgeHandler(app);
