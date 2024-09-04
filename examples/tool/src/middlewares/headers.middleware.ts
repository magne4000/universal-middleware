// src/middlewares/headers.middleware.ts

import type { Get, UniversalMiddleware } from "universal-middleware";

// This middleware will add a `X-Universal-Hello` header to all responses
const headersMiddleware = (() => (request, ctx) => {
  return (response) => {
    // `ctx.hello` exists if it has been set by another middleware
    response.headers.set("X-Universal-Hello", ctx.hello ?? "world");

    return response;
  };
  // Using `satisfies` to not lose return type
}) satisfies Get<[], UniversalMiddleware<{ hello?: string }>>;

// export default is mandatory
export default headersMiddleware;
