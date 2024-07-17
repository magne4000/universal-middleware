import type { Get, UniversalMiddleware } from "universal-middleware";

const contextMiddleware: Get<[string], UniversalMiddleware> =
  (value) => (_request, ctx) => {
    ctx.something = value;
  };

export default contextMiddleware;
