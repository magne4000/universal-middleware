import type { Get, UniversalMiddleware } from "universal-middleware";
import { setContext } from "@universal-middleware/core";

const contextMiddleware: Get<
  [string],
  UniversalMiddleware<{ something: string }>
> = (value) => (request) => {
  setContext(request, "something", value);
};

export default contextMiddleware;
