import { pipe } from "@universal-middleware/core";
import { middlewares, throwLateHandler } from "@universal-middleware/tests/utils";
import { createEdgeHandler } from "../../../src/index.js";

export const GET = createEdgeHandler(() =>
  pipe(
    middlewares.throwLate,
    middlewares.contextSync,
    middlewares.updateHeaders,
    middlewares.contextAsync,
    throwLateHandler(),
  ),
)();
