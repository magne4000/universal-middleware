import { middlewares, routeParamHandler } from "@universal-middleware/tests/utils";
import express from "express";
import { createHandler, createMiddleware } from "@universal-middleware/express";
import { createNodeHandler } from "../../../src/express.js";

const app = express();

app.use(createMiddleware(() => middlewares.contextSync)());
app.use(createMiddleware(() => middlewares.updateHeaders)());
app.use(createMiddleware(() => middlewares.contextAsync)());
app.use(
  createHandler(routeParamHandler)({
    route: "/api/express-node/user/:name",
  }),
);

export default createNodeHandler(app);
