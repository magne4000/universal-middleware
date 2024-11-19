import { pipe } from "@universal-middleware/core";
import { middlewares, routeParamHandler } from "@universal-middleware/tests/utils";
import { createEdgeHandler } from "../../../src/index.js";

export const GET = createEdgeHandler(() =>
  pipe(middlewares[0](), middlewares[1](), middlewares[2](), routeParamHandler()),
)();
