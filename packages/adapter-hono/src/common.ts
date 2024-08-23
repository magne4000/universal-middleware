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
import { getAdapterRuntime } from "@universal-middleware/core";

interface UniversalEnv {
  Bindings: Env["Bindings"];
  Variables: Env["Variables"] & Record<symbol, Universal.Context>;
}

export type HonoHandler = Handler<UniversalEnv>;
export type HonoMiddleware = MiddlewareHandler<UniversalEnv>;

export const contextSymbol = Symbol("unContext");

function getExecutionCtx(honoContext: HonoContext) {
  try {
    return honoContext.executionCtx;
  } catch {
    return;
  }
}

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
      return handler(
        honoContext.req.raw,
        context,
        getAdapterRuntime(
          "other",
          {},
          {
            env: honoContext.env,
            ctx: getExecutionCtx(honoContext),
          },
        ),
      );
    };
  };
}

/**
 * Creates a middleware to be passed to app.use() or any route function
 */
export function createMiddleware<
  T extends unknown[],
  InContext extends Universal.Context,
  OutContext extends Universal.Context,
>(
  middlewareFactory: Get<T, UniversalMiddleware<InContext, OutContext>>,
): Get<T, HonoMiddleware> {
  return (...args) => {
    const middleware = middlewareFactory(...args);

    return async (honoContext, next) => {
      let context = honoContext.get(contextSymbol) as InContext;
      if (typeof context !== "object") {
        context = {} as InContext;
        honoContext.set(contextSymbol, context);
      }
      const response = await middleware(
        honoContext.req.raw,
        context,
        getAdapterRuntime(
          "other",
          {},
          {
            env: honoContext.env,
            ctx: getExecutionCtx(honoContext),
          },
        ),
      );

      if (typeof response === "function") {
        await next();
        const res = await response(honoContext.res);
        if (res) {
          return res;
        }
      } else if (response !== null && typeof response === "object") {
        if (response instanceof Response) {
          return response;
        }
        // Update context
        honoContext.set(contextSymbol, response);
        return next();
      } else {
        return next();
      }
    };
  };
}

export function getContext<
  Context extends Universal.Context = Universal.Context,
>(honoContext: HonoContext<UniversalEnv>): Context | undefined {
  return honoContext.get(contextSymbol) as Context | undefined;
}
