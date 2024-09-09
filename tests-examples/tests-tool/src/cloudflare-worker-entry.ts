import contextMiddleware from "@universal-middleware-examples/tool/middlewares/context-middleware";
import headersMiddleware from "@universal-middleware-examples/tool/middlewares/headers-middleware";
import handler from "@universal-middleware-examples/tool/dummy-handler";
import { createHandler } from "@universal-middleware/cloudflare";
import { pipe } from "@universal-middleware/core";

// Cloudflare Workers have no internal way of representing a middleware
// Instead, we use the universal `pipe` operator
const wrapped = pipe(contextMiddleware("World!!!"), headersMiddleware(), handler());

export default createHandler(() => wrapped)();
