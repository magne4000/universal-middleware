import type { AdapterRequestContext, HattipHandler } from "@hattip/core";
import type { RequestHandler } from "@hattip/compose";
import {
  type Get,
  getContext as getContextCore,
  type UniversalHandler,
  type UniversalMiddleware,
} from "@universal-middleware/core";

export type { HattipHandler };
export type HattipMiddleware = RequestHandler;

/**
 * Creates a request handler to be passed to hattip
 */
export function createHandler<T extends unknown[]>(
  handlerFactory: Get<T, UniversalHandler>,
): Get<T, HattipHandler> {
  return (...args) => {
    const handler = handlerFactory(...args);

    return (context) => {
      return handler(context.request);
    };
  };
}

/**
 * Creates a middleware to be passed to @hattip/compose or @hattip/router
 */
export function createMiddleware<T extends unknown[]>(
  middlewareFactory: Get<T, UniversalMiddleware>,
): Get<T, HattipMiddleware> {
  return (...args) => {
    const middleware = middlewareFactory(...args);

    return async (context) => {
      const response = await middleware(context.request);

      if (typeof response === "function") {
        const res = await context.next();
        return response(res);
      } else if (typeof response === "object" && "body" in response) {
        return response;
      }
    };
  };
}

export function getContext<T extends object>(
  context: AdapterRequestContext,
): T | undefined {
  return getContextCore<T>(context.request);
}
