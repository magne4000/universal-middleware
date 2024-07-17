import type {
  Context as HonoContext,
  Env,
  Handler,
  MiddlewareHandler,
} from "hono";
import type {
  Get,
  UniversalHandler,
  UniversalMiddleware,
} from "@universal-middleware/core";

interface UniversalEnv {
  Bindings: Env["Bindings"];
  Variables: Env["Variables"] & Record<symbol, Universal.Context>;
}

export type HonoHandler = Handler<UniversalEnv>;
export type HonoMiddleware = MiddlewareHandler<UniversalEnv>;

export const contextSymbol = Symbol("unContext");

/**
 * Creates a request handler to be passed to app.all() or any other route function
 */
export function createHandler<T extends unknown[]>(
  handlerFactory: Get<T, UniversalHandler>,
): Get<T, HonoHandler> {
  return (...args) => {
    const handler = handlerFactory(...args);

    return (honoContext) => {
      let context: Universal.Context = honoContext.get(contextSymbol);
      if (typeof context !== "object") {
        context = {};
        honoContext.set(contextSymbol, context);
      }
      return handler(honoContext.req.raw, context);
    };
  };
}

/**
 * Creates a middleware to be passed to app.use() or any route function
 */
export function createMiddleware<T extends unknown[]>(
  middlewareFactory: Get<T, UniversalMiddleware>,
): Get<T, HonoMiddleware> {
  return (...args) => {
    const middleware = middlewareFactory(...args);

    return async (honoContext, next) => {
      let context: Universal.Context = honoContext.get(contextSymbol);
      if (typeof context !== "object") {
        context = {};
        honoContext.set(contextSymbol, context);
      }
      const response = await middleware(honoContext.req.raw, context);

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

export function getContext(
  honoContext: HonoContext<UniversalEnv>,
): Universal.Context | undefined {
  return honoContext.get(contextSymbol);
}
