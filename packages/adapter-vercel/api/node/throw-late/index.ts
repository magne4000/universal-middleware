import { pipe } from "@universal-middleware/core";
import { middlewares, throwLateHandler } from "@universal-middleware/tests/utils";
import { createNodeHandler } from "../../../src/index.js";

const pipedHandler = createNodeHandler(() =>
  pipe(
    middlewares.throwLate,
    middlewares.contextSync,
    middlewares.updateHeaders,
    middlewares.contextAsync,
    throwLateHandler(),
  ),
)();

export default pipedHandler;
