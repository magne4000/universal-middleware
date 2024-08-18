import type { Get, UniversalMiddleware } from "universal-middleware";

const contextMiddleware = ((value) => (_request, ctx) => {
  return {
    ...ctx,
    something: value,
  };
  // Using `satisfies` to not lose return type
}) satisfies Get<[string], UniversalMiddleware>;

export default contextMiddleware;
