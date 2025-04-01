import { pipe } from "@universal-middleware/core";
import { middlewares, throwEarlyHandler } from "@universal-middleware/tests/utils";
import { createNodeHandler } from "../../../src/index.js";

const pipedHandler = createNodeHandler(() =>
  pipe(
    middlewares.throwEarly,
    middlewares.contextSync,
    middlewares.updateHeaders,
    middlewares.contextAsync,
    throwEarlyHandler(),
  ),
)();

export default pipedHandler;
