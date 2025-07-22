import type {
  EventContext,
  ExecutionContext,
  ExportedHandlerFetchHandler,
  PagesFunction,
  Response as CloudflareResponse,
} from "@cloudflare/workers-types";
import type {
  Get,
  RuntimeAdapter,
  UniversalFn,
  UniversalHandler,
  UniversalMiddleware,
} from "@universal-middleware/core";
import { bindUniversal, contextSymbol, getAdapterRuntime, universalSymbol } from "@universal-middleware/core";

export type CloudflareHandler<In extends Universal.Context> = {
  fetch: UniversalFn<
    UniversalHandler<In>,
    ExportedHandlerFetchHandler<{
      [contextSymbol]: In;
    }>
  >;
};

export type CloudflarePagesFunction<In extends Universal.Context, Out extends Universal.Context> = UniversalFn<
  UniversalMiddleware<In, Out>,
  PagesFunction<{
    [contextSymbol]: In;
  }>
>;

/**
 * Creates a request handler for Cloudflare Worker. Should be used as dist/_worker.js
 */
export function createHandler<T extends unknown[], InContext extends Universal.Context>(
  handlerFactory: Get<T, UniversalHandler<InContext>>,
): Get<T, CloudflareHandler<InContext>> {
  return (...args) => {
    const handler = handlerFactory(...args);

    return {
      fetch: bindUniversal(handler, async function universalHandlerCloudflare(request, env, ctx) {
        const universalContext = initContext<InContext>(env);
        const response: Response | undefined = await this[universalSymbol](
          request as unknown as Request,
          universalContext,
          getRuntime(env, ctx),
        );

        return response as unknown as CloudflareResponse;
      }),
    };
  };
}

/**
 * Creates a function handler for Cloudflare Pages
 */
export function createPagesFunction<
  T extends unknown[],
  InContext extends Universal.Context,
  OutContext extends Universal.Context,
>(middlewareFactory: Get<T, UniversalHandler<InContext>>): Get<T, CloudflarePagesFunction<InContext, OutContext>>;
export function createPagesFunction<
  T extends unknown[],
  InContext extends Universal.Context,
  OutContext extends Universal.Context,
>(
  middlewareFactory: Get<T, UniversalMiddleware<InContext, OutContext>>,
): Get<T, CloudflarePagesFunction<InContext, OutContext>>;
export function createPagesFunction<
  T extends unknown[],
  InContext extends Universal.Context,
  OutContext extends Universal.Context,
>(
  middlewareFactory: Get<T, UniversalMiddleware<InContext, OutContext>>,
): Get<T, CloudflarePagesFunction<InContext, OutContext>> {
  return (...args) => {
    const middleware = middlewareFactory(...args);

    return bindUniversal(middleware, async function universalPagesFunctionCloudflare(context) {
      const universalContext = initContext<InContext>(context.env);
      const response = await this[universalSymbol](
        context.request as unknown as Request,
        universalContext,
        getRuntime(context),
      );

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
    });
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

  const key = isContext ? "cloudflare-pages" : "cloudflare-worker";

  return getAdapterRuntime(
    isContext ? "cloudflare-pages" : "cloudflare-worker",
    {
      params: isContext ? ((args[0].params as Record<string, string>) ?? undefined) : undefined,
      [key]: isContext ? args[0] : { env: args[0], ctx: args[1] },
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
