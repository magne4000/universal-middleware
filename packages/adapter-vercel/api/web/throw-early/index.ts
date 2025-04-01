import { pipe } from "@universal-middleware/core";
import { middlewares, throwEarlyHandler } from "@universal-middleware/tests/utils";
import { createEdgeHandler } from "../../../src/index.js";

export const GET = createEdgeHandler(() =>
  pipe(
    middlewares.throwEarly,
    middlewares.contextSync,
    middlewares.updateHeaders,
    middlewares.contextAsync,
    throwEarlyHandler(),
  ),
)();
