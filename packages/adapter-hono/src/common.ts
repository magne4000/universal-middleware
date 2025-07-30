import type {
  Get,
  RuntimeAdapter,
  UniversalFn,
  UniversalHandler,
  UniversalMiddleware,
} from "@universal-middleware/core";
import { bindUniversal, contextSymbol, getAdapterRuntime, universalSymbol } from "@universal-middleware/core";
import type { Context as HonoContext, Env, ExecutionContext, Handler, MiddlewareHandler } from "hono";

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

export type HonoHandler<In extends Universal.Context> = UniversalFn<UniversalHandler<In>, Handler<UniversalEnv>>;
export type HonoMiddleware<In extends Universal.Context, Out extends Universal.Context> = UniversalFn<
  UniversalMiddleware<In, Out>,
  MiddlewareHandler<UniversalEnv>
>;

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
export function createHandler<T extends unknown[], InContext extends Universal.Context>(
  handlerFactory: Get<T, UniversalHandler<InContext>>,
): Get<T, HonoHandler<InContext>> {
  return (...args) => {
    const handler = handlerFactory(...args);

    return bindUniversal(handler, async function universalHandlerHono(honoContext, next) {
      const context = initContext<InContext>(honoContext);

      const response: Response | undefined = await this[universalSymbol](
        honoContext.req.raw,
        context,
        getRuntime(honoContext),
      );

      if (response) {
        // bypasses @hono/node-server cache
        return response.clone();
      }
      // Will default to 404 if no other route matches this request
      await next();
    });
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
): Get<T, HonoMiddleware<InContext, OutContext>> {
  return (...args) => {
    const middleware = middlewareFactory(...args);

    return bindUniversal(middleware, async function universalMiddlewareHono(honoContext, next) {
      const context = initContext<InContext>(honoContext);

      const response = await this[universalSymbol](honoContext.req.raw, context, getRuntime(honoContext));

      if (typeof response === "function") {
        await next();
        const res = await response(honoContext.res);
        if (res) {
          honoContext.res = res;
        }
      } else if (response !== null && typeof response === "object") {
        if (response instanceof Response) {
          // bypasses @hono/node-server cache
          return response.clone();
        }
        // Update context
        setContext(honoContext, response);
        return next();
      } else {
        return next();
      }
    });
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
  if (honoContext.env) {
    honoContext.env[contextSymbol] = value;
  }
  if (honoContext.env?.eventContext?.env) {
    honoContext.env.eventContext.env[contextSymbol] = value;
  }
}

export function getContext<Context extends Universal.Context = Universal.Context>(
  honoContext: HonoContext<UniversalEnv>,
): Context {
  return (honoContext.get(contextSymbol) ??
    honoContext.env?.[contextSymbol] ??
    honoContext.env?.eventContext?.env[contextSymbol]) as Context;
}

export function getRuntime(honoContext: HonoContext): RuntimeAdapter {
  let params: Record<string, string> | undefined;
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
      hono: honoContext,
    },
    {
      env: honoContext.env,
      ctx,
      req: honoContext.env?.incoming,
      res: honoContext.env?.outgoing,
    },
  );
}
