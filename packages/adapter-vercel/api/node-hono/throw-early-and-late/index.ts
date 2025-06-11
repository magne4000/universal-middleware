import { middlewares, throwEarlyAndLateHandler } from "@universal-middleware/tests/utils";
import { Hono } from "hono";
import { createHandler, createMiddleware } from "@universal-middleware/hono";
import { createNodeHandler } from "../../../src/hono.js";

const app = new Hono();

app.use(createMiddleware(() => middlewares.throwEarly)());
app.use(createMiddleware(() => middlewares.throwLate)());
app.use(createMiddleware(() => middlewares.contextSync)());
app.use(createMiddleware(() => middlewares.updateHeaders)());
app.use(createMiddleware(() => middlewares.contextAsync)());
app.use(createHandler(throwEarlyAndLateHandler)());

export default createNodeHandler(app);
