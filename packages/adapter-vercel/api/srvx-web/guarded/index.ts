import { apply } from "@universal-middleware/srvx";
import { handlerRaw, middlewares } from "@universal-middleware/tests/utils";
import { createEdgeHandler } from "../../../src/srvx.js";

const app = apply([
  middlewares.guard,
  middlewares.contextSync,
  middlewares.updateHeaders,
  middlewares.contextAsync,
  handlerRaw,
]);

export const GET = createEdgeHandler(app);
