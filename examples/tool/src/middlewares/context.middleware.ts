import type { UniversalMiddleware } from "universal-middleware";

const contextMiddleware: UniversalMiddleware = (_request, ctx) => {
  ctx.something = "something";
};

export default contextMiddleware;
