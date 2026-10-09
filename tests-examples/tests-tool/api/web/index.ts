import { pipe } from "@universal-middleware/core";
// vercel-edge handler
import handler from "@universal-middleware-examples/tool/dummy-handler-vercel-edge";
// Universal middlewares
import contextMiddleware from "@universal-middleware-examples/tool/middlewares/context-middleware";
import headersMiddleware from "@universal-middleware-examples/tool/middlewares/headers-middleware";

export const GET = pipe(contextMiddleware("World!!!"), headersMiddleware(), handler());
