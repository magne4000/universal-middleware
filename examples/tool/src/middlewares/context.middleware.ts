import type { Get, UniversalMiddleware } from "universal-middleware";

const contextMiddleware = ((value) => (request, ctx) => {
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
