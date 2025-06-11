import { middlewares, routeParamHandler } from "@universal-middleware/tests/utils";
import { Hono } from "hono";
import { createHandler, createMiddleware } from "@universal-middleware/hono";
import { createNodeHandler } from "../../../src/hono.js";

const app = new Hono();

app.use(createMiddleware(() => middlewares.contextSync)());
app.use(createMiddleware(() => middlewares.updateHeaders)());
app.use(createMiddleware(() => middlewares.contextAsync)());
app.use(
  createHandler(routeParamHandler)({
    route: "/api/hono-node/user/:name",
  }),
);

export default createNodeHandler(app);
