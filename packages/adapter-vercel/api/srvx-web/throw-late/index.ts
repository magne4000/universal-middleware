import { apply } from "@universal-middleware/srvx";
import { middlewares, throwLateHandler } from "@universal-middleware/tests/utils";
import { createEdgeHandler } from "../../../src/srvx.js";

const app = apply([
  middlewares.throwLate,
  middlewares.contextSync,
  middlewares.updateHeaders,
  middlewares.contextAsync,
  throwLateHandler(),
]);

export const GET = createEdgeHandler(app);
