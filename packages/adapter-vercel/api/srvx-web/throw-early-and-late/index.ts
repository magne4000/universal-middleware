import { apply } from "@universal-middleware/srvx";
import { middlewares, throwEarlyAndLateHandler } from "@universal-middleware/tests/utils";
import { createEdgeHandler } from "../../../src/srvx.js";

const app = apply([
  middlewares.throwEarly,
  middlewares.throwLate,
  middlewares.contextSync,
  middlewares.updateHeaders,
  middlewares.contextAsync,
  throwEarlyAndLateHandler(),
]);

export const GET = createEdgeHandler(app);
