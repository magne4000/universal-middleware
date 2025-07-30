// package: @universal-middleware-examples/tool
// file: src/middlewares/context.middleware.ts

import type { Get, UniversalMiddleware } from "@universal-middleware/core";

const contextMiddleware = ((value) => (_request, ctx, _runtime) => {
  // Return the new universal context, thus keeping complete type safety
  // A less typesafe way to do the same thing would be to `ctx.something = value` and return nothing
  return {
    ...ctx,
    hello: value,
  };
  // Using `satisfies` to not lose return type
}) satisfies Get<[string], UniversalMiddleware>;

// export default is mandatory
export default contextMiddleware;
