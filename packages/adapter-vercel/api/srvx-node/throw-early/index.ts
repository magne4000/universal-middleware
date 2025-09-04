import { apply } from "@universal-middleware/srvx";
import { middlewares, throwEarlyHandler } from "@universal-middleware/tests/utils";
import { createNodeHandler } from "../../../src/srvx.js";

const app = apply([
  middlewares.throwEarly,
  middlewares.contextSync,
  middlewares.updateHeaders,
  middlewares.contextAsync,
  throwEarlyHandler(),
]);

export default createNodeHandler(app);
