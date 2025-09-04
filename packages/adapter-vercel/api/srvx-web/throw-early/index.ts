import { apply } from "@universal-middleware/srvx";
import { middlewares, throwEarlyHandler } from "@universal-middleware/tests/utils";
import { createEdgeHandler } from "../../../src/srvx.js";

const app = apply([
  middlewares.throwEarly,
  middlewares.contextSync,
  middlewares.updateHeaders,
  middlewares.contextAsync,
  throwEarlyHandler(),
]);

export const GET = createEdgeHandler(app);
