import contextMiddleware from "@universal-middleware-examples/tool/middlewares/context-middleware-cloudflare-pages";
import headersMiddleware from "@universal-middleware-examples/tool/middlewares/headers-middleware-cloudflare-pages";

export const onRequest = [contextMiddleware("World!!!"), headersMiddleware()];
