import { apply } from "@universal-middleware/srvx";
import { middlewares, routeParamHandler } from "@universal-middleware/tests/utils";
import { createNodeHandler } from "../../../src/srvx.js";

const app = apply([
  middlewares.contextSync,
  middlewares.updateHeaders,
  middlewares.contextAsync,
  routeParamHandler({
    route: "/api/srvx-node/user/:name",
  }),
]);

export default createNodeHandler(app);
