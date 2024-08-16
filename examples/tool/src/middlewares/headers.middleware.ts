import type { Get, UniversalMiddleware } from "universal-middleware";
import { getContext } from "@universal-middleware/core";

const headersMiddleware: Get<[], UniversalMiddleware<{ something: string }>> =
  () => (request) => {
    return (response) => {
      response.headers.set(
        "X-Custom-Header",
        getContext(request).something ?? "NONE",
      );

      return response;
    };
  };

export default headersMiddleware;
