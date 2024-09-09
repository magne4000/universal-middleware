import type { Get, RuntimeAdapter, UniversalHandler, UniversalMiddleware } from "@universal-middleware/core";
import { getAdapterRuntime } from "@universal-middleware/core";
import type {
  EventContext,
  ExecutionContext,
  ExportedHandlerFetchHandler,
  PagesFunction,
  Response as CloudflareResponse,
} from "@cloudflare/workers-types";

export const contextSymbol = Symbol("unContext");

export type CloudflareHandler<C extends Universal.Context> = {
  fetch: ExportedHandlerFetchHandler<{
    [contextSymbol]: C;
  }>;
};

export type CloudflarePagesFunction<C extends Universal.Context> = PagesFunction<{
  [contextSymbol]: C;
}>;

/**
 * Creates a request handler for Cloudflare Pages. Should be used as dist/_worker.js
 */
export function createHandler<T extends unknown[], C extends Universal.Context>(
  handlerFactory: Get<T, UniversalHandler>,
): Get<T, CloudflareHandler<C>> {
  return (...args) => {
    const handler = handlerFactory(...args);

    return {
      async fetch(request, env, ctx) {
        const universalContext = initContext<C>(env);
        const response = await handler(request as unknown as Request, universalContext, getRuntime(env, ctx));

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
): Get<T, CloudflarePagesFunction<InContext>>;
export function createPagesFunction<
  T extends unknown[],
  InContext extends Universal.Context,
  OutContext extends Universal.Context,
>(middlewareFactory: Get<T, UniversalMiddleware<InContext, OutContext>>): Get<T, CloudflarePagesFunction<InContext>>;
export function createPagesFunction<
  T extends unknown[],
  InContext extends Universal.Context,
  OutContext extends Universal.Context,
>(middlewareFactory: Get<T, UniversalMiddleware<InContext, OutContext>>): Get<T, CloudflarePagesFunction<InContext>> {
  return (...args) => {
    const middleware = middlewareFactory(...args);

    return async (context) => {
      const universalContext = initContext<InContext>(context.env);
      const response = await middleware(context.request as unknown as Request, universalContext, getRuntime(context));

      if (typeof response === "function") {
        const cloudflareResponse = await context.next();
        const res = await response(cloudflareResponse as unknown as Response);
        return (res ?? cloudflareResponse) as unknown as CloudflareResponse;
      }
      if (response !== null && typeof response === "object") {
        if (response instanceof Response) {
          return response as unknown as CloudflareResponse;
        }
        // Update context
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        setContext(context.env, response as any);
        return await context.next();
      }

      return await context.next();
    };
  };
}

function initContext<Context extends Universal.Context = Universal.Context>(env: {
  [contextSymbol]?: Context;
}): Context {
  env[contextSymbol] ??= {} as Context;
  return env[contextSymbol];
}

export function getContext<Context extends Universal.Context = Universal.Context>(env: {
  [contextSymbol]: Context;
}): Context {
  return env[contextSymbol] as Context;
}

function setContext<Context extends Universal.Context = Universal.Context>(
  env: { [contextSymbol]?: Context },
  value: Context,
): void {
  env[contextSymbol] = value;
}

export function getRuntime(env: unknown, ctx: ExecutionContext): RuntimeAdapter;
export function getRuntime(context: EventContext<unknown, string, unknown>): RuntimeAdapter;
export function getRuntime(
  ...args: [EventContext<unknown, string, unknown>] | [unknown, ExecutionContext]
): RuntimeAdapter {
  const isContext = args.length === 1;

  return getAdapterRuntime(
    "other",
    {},
    {
      env: isContext ? args[0].env : args[0],
      ctx: {
        waitUntil: isContext ? args[0].waitUntil : args[1].waitUntil,
        passThroughOnException: isContext ? args[0].passThroughOnException : args[1].passThroughOnException,
      },
    },
  );
}
