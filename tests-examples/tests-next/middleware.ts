import contextMiddleware from "@universal-middleware-examples/tool/middlewares/context-middleware";
import headersMiddleware from "@universal-middleware-examples/tool/middlewares/headers-middleware";
import { createGenericMiddleware, getRequestContext, pipe } from "@universal-middleware/core";
import { NextResponse } from "next/server";

// FIXME: use `const response = NextResponse.next()`
export const middleware = createGenericMiddleware(() =>
  pipe(contextMiddleware("World!!!"), headersMiddleware(), (request, ctx) => {
    console.log("OUTER", getRequestContext(request));
    return NextResponse.next();
  }),
)();

export const config = {
  matcher: "/",
};
