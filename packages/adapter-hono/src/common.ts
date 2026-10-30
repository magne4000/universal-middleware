import type {
  Awaitable,
  Get,
  RuntimeAdapter,
  UniversalFn,
  UniversalHandler,
  UniversalMiddleware,
} from "@universal-middleware/core";
import {
  bindUniversal,
  cancelReplacedBody,
  contextSymbol,
  getAdapterRuntime,
  keepBody,
  universalSymbol,
  withMutableHeaders,
} from "@universal-middleware/core";
import type { Env, ExecutionContext, Handler, Context as HonoContext, MiddlewareHandler } from "hono";

// The response functions of a request, applied in registration order by the middleware that returned the first one
const pendingMiddlewaresSymbol = Symbol.for("unPendingMiddlewares");

interface UniversalEnv {
  Bindings: Env["Bindings"] & {
    // biome-ignore lint/suspicious/noExplicitAny: avoid hono/cloudflare-pages typing conflict
    eventContext: any;
  };
  Variables: Env["Variables"] & {
    [contextSymbol]?: Universal.Context;
    [pendingMiddlewaresSymbol]?: ((response: Response) => Awaitable<Response | undefined>)[];
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
        return stripHonoCache(response);
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
      keepBody(honoContext.req.raw);

      const response = await this[universalSymbol](honoContext.req.raw, context, getRuntime(honoContext));

      if (typeof response === "function") {
        const pending = honoContext.get(pendingMiddlewaresSymbol);
        if (pending) {
          pending.push(response);
          return next();
        }
        const middlewares = [response];
        honoContext.set(pendingMiddlewaresSymbol, middlewares);
        await next();
        for (const middleware of middlewares) {
          // Hono merges the headers of the Response it holds into one it's given: the copy goes in before they change
          const mutable = withMutableHeaders(honoContext.res);
          if (mutable !== honoContext.res) {
            // Unset first: else Hono's setter copies it again, without its `url`
            honoContext.res = undefined;
            honoContext.res = mutable;
          }
          const original = honoContext.res;
          const res = await middleware(original);
          cancelReplacedBody(original, res);
          // `c.header()` swaps in a copy of `c.res`; setting the one Hono holds would copy it again, without its `url`
          if (res && res !== honoContext.res) honoContext.res = res;
        }
      } else if (response !== null && typeof response === "object") {
        if (response instanceof Response) {
          return stripHonoCache(response);
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

function stripHonoCache(response: Response): Response {
  const ownSymbols = Object.getOwnPropertySymbols(response);
  for (const sym of ownSymbols) {
    if (sym.toString() === "Symbol(cache)") {
      // @hono/node-server checks for this symbol and reads [status, body, headers]
      // from it directly, bypassing response.body. Deleting it forces node-server
      // to read response.body normally, which is required for stream cancellation
      // to propagate when the client disconnects.
      // biome-ignore lint/suspicious/noExplicitAny: intentional cache bypass
      delete (response as any)[sym];
    }
  }
  return response;
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
  // Not on env: Workers, Pages and Bun share it across requests. Separate Pages functions share eventContext.data, one per request.
  if (honoContext.env?.eventContext?.data) {
    honoContext.env.eventContext.data[contextSymbol] = value;
  }
}

export function getContext<Context extends Universal.Context = Universal.Context>(
  honoContext: HonoContext<UniversalEnv>,
): Context {
  return (honoContext.get(contextSymbol) ??
    honoContext.env?.eventContext?.data?.[contextSymbol] ??
    // the srvx adapter keeps a request's context on the request itself
    (honoContext.req.raw as Request & { context?: unknown }).context) as Context;
}

export function getRuntime(honoContext: HonoContext): RuntimeAdapter {
  let params: Record<string, string> | undefined;
  const ctx = getExecutionCtx(honoContext);
  try {
    params = honoContext.req.param();
  } catch {
    params = undefined;
  }
  // Retrieve Cloudflare Pages potential params
  if (!params || Object.keys(params).length === 0) {
    params =
      (ctx as { params?: Record<string, string> } | undefined)?.params ??
      honoContext.env?.eventContext?.params ??
      undefined;
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
    honoContext.req.raw,
  );
}
