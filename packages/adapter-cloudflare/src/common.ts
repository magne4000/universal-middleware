import type {
  Response as CloudflareResponse,
  EventContext,
  ExecutionContext,
  ExportedHandlerFetchHandler,
  PagesFunction,
} from "@cloudflare/workers-types";
import type { Get, RuntimeAdapter, UniversalHandler, UniversalMiddleware } from "@universal-middleware/core";
import {
  getAdapterRuntime,
  getRequestContextAndRuntime,
  initRequestWeb,
  setRequestContext,
} from "@universal-middleware/core";

export type CloudflareHandler = {
  fetch: ExportedHandlerFetchHandler;
};

export type CloudflarePagesFunction = PagesFunction;

/**
 * Creates a request handler for Cloudflare Worker. Should be used as dist/_worker.js
 */
export function createHandler<T extends unknown[]>(
  handlerFactory: Get<T, UniversalHandler>,
): Get<T, CloudflareHandler> {
  return (...args) => {
    const handler = handlerFactory(...args);

    return {
      async fetch(request, env, ctx) {
        initRequestWeb(request as unknown as Request, request, () => getRuntime(env, ctx));
        const { context, runtime } = getRequestContextAndRuntime(request as unknown as Request);
        const response = await handler(request as unknown as Request, context, runtime);

        return response as unknown as CloudflareResponse;
      },
    };
  };
}

/**
 * Creates a function handler for Cloudflare Pages
 */
export function createPagesFunction<T extends unknown[], InContext extends Universal.Context>(
  middlewareFactory: Get<T, UniversalHandler<InContext>>,
): Get<T, CloudflarePagesFunction>;
export function createPagesFunction<
  T extends unknown[],
  InContext extends Universal.Context,
  OutContext extends Universal.Context,
>(middlewareFactory: Get<T, UniversalMiddleware<InContext, OutContext>>): Get<T, CloudflarePagesFunction>;
export function createPagesFunction<
  T extends unknown[],
  InContext extends Universal.Context,
  OutContext extends Universal.Context,
>(middlewareFactory: Get<T, UniversalMiddleware<InContext, OutContext>>): Get<T, CloudflarePagesFunction> {
  return (...args) => {
    const middleware = middlewareFactory(...args);

    return async (ctx) => {
      initRequestWeb(ctx.request as unknown as Request, ctx, () => getRuntime(ctx));
      const { context, runtime } = getRequestContextAndRuntime<InContext>(ctx.request as unknown as Request);
      const response = await middleware(ctx.request as unknown as Request, context, runtime);

      if (typeof response === "function") {
        const cloudflareResponse = await ctx.next();
        const res = await response(cloudflareResponse as unknown as Response);
        return (res ?? cloudflareResponse) as unknown as CloudflareResponse;
      }
      if (response !== null && typeof response === "object") {
        if (response instanceof Response) {
          return response as unknown as CloudflareResponse;
        }
        // Update context
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        setRequestContext(ctx.request as unknown as Request, response as any);
        return await ctx.next();
      }

      return await ctx.next();
    };
  };
}

export function getRuntime(env: unknown, ctx: ExecutionContext): RuntimeAdapter;
export function getRuntime(context: EventContext<unknown, string, unknown>): RuntimeAdapter;
export function getRuntime(
  ...args: [EventContext<unknown, string, unknown>] | [unknown, ExecutionContext]
): RuntimeAdapter {
  const isContext = args.length === 1;

  return getAdapterRuntime(
    isContext ? "cloudflare-pages" : "cloudflare-worker",
    {
      params: isContext ? ((args[0].params as Record<string, string>) ?? undefined) : undefined,
    },
    {
      env: isContext ? args[0].env : args[0],
      ctx: {
        waitUntil: isContext ? args[0].waitUntil : args[1].waitUntil,
        passThroughOnException: isContext ? args[0].passThroughOnException : args[1].passThroughOnException,
      },
    },
  );
}
