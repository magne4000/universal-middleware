import { pipe } from "@universal-middleware/core";
import { middlewares, throwEarlyAndLateHandler } from "@universal-middleware/tests/utils";
import { createNodeHandler } from "../../../src/index.js";

const pipedHandler = createNodeHandler(() =>
  pipe(
    middlewares.throwEarly,
    middlewares.throwLate,
    middlewares.contextSync,
    middlewares.updateHeaders,
    middlewares.contextAsync,
    throwEarlyAndLateHandler(),
  ),
)();

export default pipedHandler;
