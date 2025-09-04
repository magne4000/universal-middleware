import { apply } from "@universal-middleware/srvx";
import { middlewares, routeParamHandler } from "@universal-middleware/tests/utils";
import { createEdgeHandler } from "../../../src/srvx.js";

const app = apply([
  middlewares.contextSync,
  middlewares.updateHeaders,
  middlewares.contextAsync,
  routeParamHandler({
    route: "/api/srvx-web/user/:name",
  }),
]);

export const GET = createEdgeHandler(app);
