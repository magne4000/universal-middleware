import { middlewares, throwLateHandler } from "@universal-middleware/tests/utils";
import { Hono } from "hono";
import { createHandler, createMiddleware } from "@universal-middleware/hono";
import { createEdgeHandler } from "../../../src/hono.js";

const app = new Hono();

app.use(createMiddleware(() => middlewares.throwLate)());
app.use(createMiddleware(() => middlewares.contextSync)());
app.use(createMiddleware(() => middlewares.updateHeaders)());
app.use(createMiddleware(() => middlewares.contextAsync)());
app.use(createHandler(throwLateHandler)());

export const GET = createEdgeHandler(app);
