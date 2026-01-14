// package: @universal-middleware-examples/tool
// file: src/middlewares/context.middleware.ts

import type { Get, UniversalMiddleware } from "@universal-middleware/core";

const contextMiddleware = ((value) => (_request, ctx, _runtime) => {
  // Return the new context, keeping complete type safety
  // type-safe way. Equivalent to `ctx.hello = value`
  return {
    ...ctx,
    hello: value,
  };
  // Using `satisfies` to not lose return type
}) satisfies Get<[string], UniversalMiddleware>;

export default contextMiddleware;
