import type {
  Get,
  RuntimeAdapter,
  UniversalFn,
  UniversalHandler,
  UniversalMiddleware,
} from "@universal-middleware/core";
import { bindUniversal, getAdapterRuntime, universalSymbol } from "@universal-middleware/core";
import type { Context as HonoContext, Env, ExecutionContext, Handler, MiddlewareHandler } from "hono";

export const contextSymbol = Symbol.for("unContext");

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

// biome-ignore lint/suspicious/noExplicitAny: extends
export type HonoHandler<H extends UniversalHandler<any>> = UniversalFn<H, Handler<UniversalEnv>>;
// biome-ignore lint/suspicious/noExplicitAny: extends
export type HonoMiddleware<M extends UniversalMiddleware<any, any>> = UniversalFn<M, MiddlewareHandler<UniversalEnv>>;

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
export function createHandler<
  T extends unknown[],
  InContext extends Universal.Context,
  H extends UniversalHandler<InContext>,
>(handlerFactory: Get<T, H>): Get<T, HonoHandler<H>> {
  return (...args) => {
    const handler = handlerFactory(...args);

    return bindUniversal(handler, async function universalHandlerHono(honoContext) {
      const context = initContext<InContext>(honoContext);

      const response: Response | undefined = await this[universalSymbol](
        honoContext.req.raw,
        context,
        getRuntime(honoContext),
      );

      if (response) {
        return response;
      }
      return honoContext.notFound();
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
  M extends UniversalMiddleware<InContext, OutContext>,
>(middlewareFactory: Get<T, M>): Get<T, HonoMiddleware<M>> {
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
          return response;
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
  honoContext.env[contextSymbol] = value;
  if (honoContext.env?.eventContext?.env) {
    honoContext.env.eventContext.env[contextSymbol] = value;
  }
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
