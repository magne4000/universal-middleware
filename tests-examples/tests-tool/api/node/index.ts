import { pipe } from "@universal-middleware/core";
// vercel-node handler
import handler from "@universal-middleware-examples/tool/dummy-handler-vercel-node";
// Universal middlewares
import contextMiddleware from "@universal-middleware-examples/tool/middlewares/context-middleware";
import headersMiddleware from "@universal-middleware-examples/tool/middlewares/headers-middleware";

export default pipe(contextMiddleware("World!!!"), headersMiddleware(), handler());
