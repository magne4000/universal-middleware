import type { UniversalMiddleware } from "universal-middleware";

const headersMiddleware: UniversalMiddleware = (_request, ctx) => {
  return (response) => {
    response.headers.set("X-Custom-Header", ctx.something ?? "NONE");

    return response;
  };
};

export default headersMiddleware;
