import { pipe } from "@universal-middleware/core";
import { middlewares, routeParamHandler } from "@universal-middleware/tests/utils";
import { createNodeHandler } from "../../../src/index.js";

const pipedHandler = createNodeHandler(() =>
  pipe(
    middlewares[0](),
    middlewares[1](),
    middlewares[2](),
    routeParamHandler({
      route: "/api/node/user/:name",
    }),
  ),
)();

export default pipedHandler;
