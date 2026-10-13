import { createHandler, createMiddleware } from "@universal-middleware/h3";
import { middlewares, routeParamHandler } from "@universal-middleware/tests/utils";
import { H3 } from "h3";
import { createEdgeHandler } from "../../../src/h3.js";

const app = new H3();

app.use(createMiddleware(() => middlewares.contextSync)());
app.use(createMiddleware(() => middlewares.updateHeaders)());
app.use(createMiddleware(() => middlewares.contextAsync)());
app.use(
  createHandler(routeParamHandler)({
    route: "/api/h3-web/user/:name",
  }),
);

export const GET = createEdgeHandler(app);
