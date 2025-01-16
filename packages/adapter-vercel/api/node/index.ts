import { pipe } from "@universal-middleware/core";
import { handler, middlewares } from "@universal-middleware/tests/utils";
import { createNodeHandler } from "../../src/index.js";

const pipedHandler = createNodeHandler(() =>
  pipe(middlewares.contextSync, middlewares.updateHeaders, middlewares.contextAsync, handler()),
)();

export default pipedHandler;
