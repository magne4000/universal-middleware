import type {
  Get,
  RuntimeAdapter,
  UniversalFn,
  UniversalHandler,
  UniversalMiddleware,
} from "@universal-middleware/core";
import { bindUniversal, getAdapterRuntime, universalSymbol } from "@universal-middleware/core";
import type { DataResult, MiddlewareFn } from "@webroute/middleware";
import type { RequestCtx } from "@webroute/route";

export type WebrouteHandler<
  InContext extends object,
  // biome-ignore lint/suspicious/noConfusingVoidType: ignored
  TResult extends DataResult | void = void,
  TParams = unknown,
  TQuery = unknown,
  TBody = unknown,
  THeaders = unknown,
  TState extends InContext = InContext,
  TProviders = unknown,
> = UniversalFn<
  UniversalHandler<Extract<InContext, Universal.Context>>,
  MiddlewareFn<TResult, [ctx: RequestCtx<TParams, TQuery, TBody, THeaders, TState, TProviders>]>
>;

export type WebrouteMiddleware<
  InContext extends object,
  OutContext extends object,
  // biome-ignore lint/suspicious/noConfusingVoidType: ignored
  TResult extends DataResult | void = void,
  TParams = unknown,
  TQuery = unknown,
  TBody = unknown,
  THeaders = unknown,
  TState extends InContext = InContext,
  TProviders = unknown,
> = UniversalFn<
  UniversalMiddleware<Extract<InContext, Universal.Context>, Extract<OutContext, Universal.Context>>,
  MiddlewareFn<TResult, [ctx: RequestCtx<TParams, TQuery, TBody, THeaders, TState, TProviders>]>
>;

// biome-ignore lint/suspicious/noConfusingVoidType: ignored
type ExtractVoid<T, U> = T extends U ? T : void;

// biome-ignore lint/suspicious/noExplicitAny: ignored
type MiddlewareFactoryReturnType<T extends (...args: any) => any> =
  // biome-ignore lint/suspicious/noExplicitAny: ignored
  ReturnType<T> extends UniversalMiddleware<any, any> ? Awaited<ReturnType<ReturnType<T>>> : never;

// biome-ignore lint/suspicious/noExplicitAny: ignored
export type MiddlewareFactoryDataResult<T extends (...args: any) => any> = ExtractVoid<
  MiddlewareFactoryReturnType<T>,
  DataResult
>;

/**
 * Creates a request handler to be passed to app.all() or any other route function
 */
export function createHandler<T extends unknown[], InContext extends Universal.Context>(
  handlerFactory: Get<T, UniversalHandler<InContext>>,
): Get<T, WebrouteHandler<InContext>> {
  return (...args) => {
    const handler = handlerFactory(...args);

    return bindUniversal(handler, async function universalHandlerWebroute(request, ctx) {
      const context = initContext<InContext>(ctx);
      return this[universalSymbol](request, context, await getRuntime(ctx));
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
): Get<T, WebrouteMiddleware<InContext, OutContext, MiddlewareFactoryDataResult<typeof middlewareFactory>>> {
  // @ts-ignore
  return (...args) => {
    const middleware = middlewareFactory(...args);

    return bindUniversal(
      middleware,
      async function universalMiddlewareWebroute(
        request: Request,
        ctx: RequestCtx<unknown, unknown, unknown, unknown, InContext>,
      ) {
        const context = initContext<InContext>(ctx);
        return this[universalSymbol](request, context, await getRuntime(ctx));
      },
    );
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
    webroute: ctx,
  });
}
