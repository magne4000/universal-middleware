import handler from "@universal-middleware-examples/tool/dummy-handler";
import contextMiddleware from "@universal-middleware-examples/tool/middlewares/context-middleware";
import headersMiddleware from "@universal-middleware-examples/tool/middlewares/headers-middleware";
import paramsHandler from "@universal-middleware-examples/tool/params-handler";
import { createHandler } from "@universal-middleware/cloudflare";
import compress from "@universal-middleware/compress";
import { pipe } from "@universal-middleware/core";

const paramsHandlerInstance = paramsHandler({
  route: "/user/:name",
});

// Cloudflare Workers have no internal way of representing a middleware
// Instead, we use the universal `pipe` operator
const wrapped = pipe(
  contextMiddleware("World!!!"),
  headersMiddleware(),
  (request, ctx, runtime) => {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/user/")) {
      return paramsHandlerInstance(request, ctx, runtime);
    }
  },
  compress(),
  handler(),
);

export default createHandler(() => wrapped)();
