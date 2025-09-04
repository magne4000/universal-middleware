import { apply } from "@universal-middleware/srvx";
import { middlewares, throwEarlyAndLateHandler } from "@universal-middleware/tests/utils";
import { createNodeHandler } from "../../../src/srvx.js";

const app = apply([
  middlewares.throwEarly,
  middlewares.throwLate,
  middlewares.contextSync,
  middlewares.updateHeaders,
  middlewares.contextAsync,
  throwEarlyAndLateHandler(),
]);

export default createNodeHandler(app);
