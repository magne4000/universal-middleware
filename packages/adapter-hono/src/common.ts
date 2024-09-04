import type {
  Context as HonoContext,
  Env,
  Handler,
  MiddlewareHandler,
} from "hono";
import type {
  Get,
  RuntimeAdapter,
  UniversalHandler,
  UniversalMiddleware,
} from "@universal-middleware/core";
import { getAdapterRuntime } from "@universal-middleware/core";

interface UniversalEnv {
  Bindings: Env["Bindings"] & {
    [contextSymbol]?: Universal.Context;
  };
  Variables: Env["Variables"] & {
    [contextSymbol]?: Universal.Context;
  };
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
      const context = initContext(honoContext);
      return handler(honoContext.req.raw, context, getRuntime(honoContext));
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
      const context = initContext<InContext>(honoContext);

      const response = await middleware(
        honoContext.req.raw,
        context,
        getRuntime(honoContext),
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
        setContext(honoContext, response);
        return next();
      } else {
        return next();
      }
    };
  };
}

function initContext<Context extends Universal.Context = Universal.Context>(
  honoContext: HonoContext<UniversalEnv>,
): Context {
  let ctx = getContext<Context>(honoContext);
  if (ctx === undefined) {
    ctx = {} as Context;
    setContext(honoContext, ctx);
  }
  return ctx;
}

function setContext<Context extends Universal.Context = Universal.Context>(
  honoContext: HonoContext<UniversalEnv>,
  value: Context,
): void {
  honoContext.set(contextSymbol, value);
  honoContext.env[contextSymbol] = value;
}

export function getContext<
  Context extends Universal.Context = Universal.Context,
>(honoContext: HonoContext<UniversalEnv>): Context {
  return (honoContext.get(contextSymbol) ??
    honoContext.env[contextSymbol]) as Context;
}

export function getRuntime(honoContext: HonoContext): RuntimeAdapter {
  return getAdapterRuntime(
    "other",
    {},
    {
      env: honoContext.env,
      ctx: getExecutionCtx(honoContext),
    },
  );
}
