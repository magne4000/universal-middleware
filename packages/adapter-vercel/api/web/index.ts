import { pipe } from "@universal-middleware/core";
import { handler, middlewares } from "@universal-middleware/tests/utils";
import { createEdgeHandler } from "../../src/index.js";

export const GET = createEdgeHandler(() =>
  pipe(middlewares.contextSync, middlewares.updateHeaders, middlewares.contextAsync, handler()),
)();
