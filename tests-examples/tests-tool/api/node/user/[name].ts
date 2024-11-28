// Universal middlewares
import contextMiddleware from "@universal-middleware-examples/tool/middlewares/context-middleware";
import headersMiddleware from "@universal-middleware-examples/tool/middlewares/headers-middleware";
// vercel-node handler
import paramsHandler from "@universal-middleware-examples/tool/params-handler-vercel-node";
import { pipe } from "@universal-middleware/core";

export default pipe(contextMiddleware("World!!!"), headersMiddleware(), paramsHandler());
