import { middlewares, throwEarlyHandler } from "@universal-middleware/tests/utils";
import { Hono } from "hono";
import { createHandler, createMiddleware } from "@universal-middleware/hono";
import { createNodeHandler } from "../../../src/hono.js";

const app = new Hono();

app.use(createMiddleware(() => middlewares.throwEarly)());
app.use(createMiddleware(() => middlewares.contextSync)());
app.use(createMiddleware(() => middlewares.updateHeaders)());
app.use(createMiddleware(() => middlewares.contextAsync)());
app.use(createHandler(throwEarlyHandler)());

export default createNodeHandler(app);
