import type { Get, RuntimeAdapter, UniversalHandler, UniversalMiddleware } from "@universal-middleware/core";
import { attachContextAndRuntime, getAdapterRuntime } from "@universal-middleware/core";
import type { DataResult, MiddlewareFn } from "@webroute/middleware";
import type { RequestCtx } from "@webroute/route";

export type WebrouteMiddleware<
  // biome-ignore lint/complexity/noBannedTypes: <explanation>
  InContext extends object = {},
  // biome-ignore lint/suspicious/noConfusingVoidType: <explanation>
  TResult extends DataResult | void = void,
  TParams = unknown,
  TQuery = unknown,
  TBody = unknown,
  THeaders = unknown,
  TState extends InContext = InContext,
  TProviders = unknown,
> = MiddlewareFn<TResult, [ctx: RequestCtx<TParams, TQuery, TBody, THeaders, TState, TProviders>]>;

export type WebrouteHandler<
  // biome-ignore lint/complexity/noBannedTypes: <explanation>
  InContext extends object = {},
  // biome-ignore lint/suspicious/noConfusingVoidType: <explanation>
  TResult extends DataResult | void = void,
  TParams = unknown,
  TQuery = unknown,
  TBody = unknown,
  THeaders = unknown,
  TState extends InContext = InContext,
  TProviders = unknown,
> = WebrouteMiddleware<InContext, TResult, TParams, TQuery, TBody, THeaders, TState, TProviders>;

/**
 * Creates a request handler to be passed to app.all() or any other route function
 */
export function createHandler<T extends unknown[], InContext extends Universal.Context>(
  handlerFactory: Get<T, UniversalHandler>,
): Get<T, WebrouteHandler<InContext>> {
  return (...args) => {
    const handler = handlerFactory(...args);

    return async (request, ctx) => {
      const context = initContext(ctx);
      const runtime = await getRuntime(ctx);
      attachContextAndRuntime(request, context, runtime);
      return handler(request, context, runtime);
    };
  };
}

// biome-ignore lint/suspicious/noConfusingVoidType: <explanation>
type ExtractVoid<T, U> = T extends U ? T : void;

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
type MiddlewareFactoryReturnType<T extends (...args: any) => any> =
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  ReturnType<T> extends UniversalMiddleware<any, any> ? Awaited<ReturnType<ReturnType<T>>> : never;

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export type MiddlewareFactoryDataResult<T extends (...args: any) => any> = ExtractVoid<
  MiddlewareFactoryReturnType<T>,
  DataResult
>;

/**
 * Creates a middleware to be passed to app.use() or any route function
 */
export function createMiddleware<
  T extends unknown[],
  InContext extends Universal.Context,
  OutContext extends Universal.Context,
>(
  middlewareFactory: Get<T, UniversalMiddleware<InContext, OutContext>>,
): Get<T, WebrouteMiddleware<InContext, MiddlewareFactoryDataResult<typeof middlewareFactory>>> {
  return (...args) => {
    const middleware = middlewareFactory(...args);

    return (async (request, ctx) => {
      const context = initContext(ctx);
      const runtime = await getRuntime(ctx);
      attachContextAndRuntime(request, context, runtime);
      return middleware(request, context, runtime);
    }) as WebrouteMiddleware<InContext, MiddlewareFactoryDataResult<typeof middlewareFactory>>;
  };
}

function initContext<Context extends Universal.Context = Universal.Context>(
  ctx: RequestCtx<unknown, unknown, unknown, unknown, Context>,
): Context {
  ctx.state ??= {} as Context;
  return ctx.state;
}

export function getContext<Context extends Universal.Context = Universal.Context>(
  ctx: RequestCtx<unknown, unknown, unknown, unknown, Context>,
): Context {
  return ctx.state;
}

export async function getRuntime(ctx: RequestCtx | undefined): Promise<RuntimeAdapter> {
  const parsed = await ctx?.parse();

  const params = (parsed?.params as Record<string, string>) ?? undefined;

  return getAdapterRuntime("webroute", {
    params,
  });
}
