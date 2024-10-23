import type { Get, RuntimeAdapter, UniversalHandler, UniversalMiddleware } from "@universal-middleware/core";
import { attachContextAndRuntime, getAdapterRuntime } from "@universal-middleware/core";
import type { Env, ExecutionContext, Handler, Context as HonoContext, MiddlewareHandler } from "hono";

export const contextSymbol = Symbol("unContext");

interface UniversalEnv {
  Bindings: Env["Bindings"] & {
    [contextSymbol]?: Universal.Context;
    // biome-ignore lint/suspicious/noExplicitAny: avoid hono/cloudflare-pages typing conflict
    eventContext: any;
  };
  Variables: Env["Variables"] & {
    [contextSymbol]?: Universal.Context;
  };
}

export type HonoHandler = Handler<UniversalEnv>;
export type HonoMiddleware = MiddlewareHandler<UniversalEnv>;

function getExecutionCtx(honoContext: HonoContext): ExecutionContext | undefined {
  try {
    return honoContext.executionCtx;
  } catch {
    return;
  }
}

/**
 * Creates a request handler to be passed to app.all() or any other route function
 */
export function createHandler<T extends unknown[]>(handlerFactory: Get<T, UniversalHandler>): Get<T, HonoHandler> {
  return (...args) => {
    const handler = handlerFactory(...args);

    return (honoContext) => {
      const runtime = getRuntime(honoContext);
      const context = initContext(honoContext, runtime);
      return handler(honoContext.req.raw, context, runtime);
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
>(middlewareFactory: Get<T, UniversalMiddleware<InContext, OutContext>>): Get<T, HonoMiddleware> {
  return (...args) => {
    const middleware = middlewareFactory(...args);

    return async (honoContext, next) => {
      const runtime = getRuntime(honoContext);
      const context = initContext<InContext>(honoContext, runtime);

      const response = await middleware(honoContext.req.raw, context, runtime);

      if (typeof response === "function") {
        await next();
        const res = await response(honoContext.res);
        if (res) {
          honoContext.res = res;
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
  runtime: RuntimeAdapter,
): Context {
  let ctx = getContext<Context>(honoContext);
  if (ctx === undefined) {
    ctx = {} as Context;
    setContext(honoContext, ctx, runtime);
  }
  return ctx;
}

function setContext<Context extends Universal.Context = Universal.Context>(
  honoContext: HonoContext<UniversalEnv>,
  value: Context,
  runtime?: RuntimeAdapter,
): void {
  honoContext.set(contextSymbol, value);
  honoContext.env[contextSymbol] = value;
  if (honoContext.env?.eventContext?.env) {
    honoContext.env.eventContext.env[contextSymbol] = value;
  }
  attachContextAndRuntime(honoContext.req.raw, value, runtime);
}

export function getContext<Context extends Universal.Context = Universal.Context>(
  honoContext: HonoContext<UniversalEnv>,
): Context {
  return (honoContext.get(contextSymbol) ??
    honoContext.env[contextSymbol] ??
    honoContext.env?.eventContext?.env[contextSymbol]) as Context;
}

export function getRuntime(honoContext: HonoContext): RuntimeAdapter {
  let params: Record<string, string> | undefined = undefined;
  const ctx = getExecutionCtx(honoContext);
  try {
    params = honoContext.req.param();
  } catch {
    // Retrieve Cloudflare Pages potential params
    if (ctx) {
      params = (ctx as { params?: Record<string, string> }).params ?? undefined;
    }
  }
  return getAdapterRuntime(
    "hono",
    {
      params,
    },
    {
      env: honoContext.env,
      ctx,
      req: honoContext.env?.incoming,
      res: honoContext.env?.outgoing,
    },
  );
}
