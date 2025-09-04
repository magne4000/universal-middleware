import { apply } from "@universal-middleware/srvx";
import { middlewares, throwLateHandler } from "@universal-middleware/tests/utils";
import { createNodeHandler } from "../../../src/srvx.js";

const app = apply([
  middlewares.throwLate,
  middlewares.contextSync,
  middlewares.updateHeaders,
  middlewares.contextAsync,
  throwLateHandler(),
]);

export default createNodeHandler(app);
