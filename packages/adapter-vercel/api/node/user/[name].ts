import { pipe } from "@universal-middleware/core";
import { middlewares, routeParamHandler } from "@universal-middleware/tests/utils";
import { createNodeHandler } from "../../../src/index.js";

const pipedHandler = createNodeHandler(() =>
  pipe(middlewares.contextSync, middlewares.updateHeaders, middlewares.contextAsync, routeParamHandler()),
)();

export default pipedHandler;
