import type {
  Context as HonoContext,
  Env,
  Handler,
  MiddlewareHandler,
} from "hono";
import {
  type Get,
  getContext as getContextCore,
  type UniversalHandler,
  type UniversalMiddleware,
} from "@universal-middleware/core";

interface UniversalEnv<T extends object> {
  Bindings: Env["Bindings"];
  Variables: Env["Variables"] & Record<symbol, T>;
}

export type HonoHandler<T extends object> = Handler<UniversalEnv<T>>;
export type HonoMiddleware<T extends object> = MiddlewareHandler<
  UniversalEnv<T>
>;

export const contextSymbol = Symbol("unContext");

/**
 * Creates a request handler to be passed to app.all() or any other route function
 */
export function createHandler<T extends unknown[]>(
  handlerFactory: Get<T, UniversalHandler>,
): Get<T, HonoHandler<T>> {
  return (...args) => {
    const handler = handlerFactory(...args);

    return (honoContext) => {
      initContext(honoContext);
      return handler(honoContext.req.raw);
    };
  };
}

/**
 * Creates a middleware to be passed to app.use() or any route function
 */
export function createMiddleware<T extends unknown[], C extends object>(
  middlewareFactory: Get<T, UniversalMiddleware<C>>,
): Get<T, HonoMiddleware<C>> {
  return (...args) => {
    const middleware = middlewareFactory(...args);

    return async (honoContext, next) => {
      initContext(honoContext);
      const response = await middleware(honoContext.req.raw);

      if (typeof response === "function") {
        await next();
        honoContext.res = await response(honoContext.res);
      } else if (typeof response === "object" && "body" in response) {
        return response;
      } else {
        return next();
      }
    };
  };
}

function initContext<T extends object>(
  honoContext: HonoContext<UniversalEnv<T>>,
): void {
  const ctx = getContextCore<T>(honoContext.req.raw);
  honoContext.set(contextSymbol, ctx);
}

export function getContext<T extends object>(
  honoContext: HonoContext<UniversalEnv<T>>,
): T | undefined {
  return honoContext.get(contextSymbol);
}
