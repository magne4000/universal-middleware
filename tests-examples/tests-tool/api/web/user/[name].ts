// Universal middlewares
import contextMiddleware from "@universal-middleware-examples/tool/middlewares/context-middleware";
import headersMiddleware from "@universal-middleware-examples/tool/middlewares/headers-middleware";
// vercel-edge handler
import handler from "@universal-middleware-examples/tool/params-handler-vercel-edge";
import { pipe } from "@universal-middleware/core";

export const GET = pipe(contextMiddleware("World!!!"), headersMiddleware(), handler());
