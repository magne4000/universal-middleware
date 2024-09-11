import { pipe } from "@universal-middleware/core";
import { handler, middlewares, routeParamHandler } from "@universal-middleware/tests/utils";
import { createHandler } from "../src/index.js";

const routeParamHandlerInstance = routeParamHandler({
  route: "/user/:name",
});

const cloudflareHandler = pipe(
  middlewares[0](),
  middlewares[1](),
  middlewares[2](),
  (request, ctx, runtime) => {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/user/")) {
      return routeParamHandlerInstance(request, ctx, runtime);
    }
  },
  handler(),
);

export default createHandler(() => cloudflareHandler)();
