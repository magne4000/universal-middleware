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
  fetch: UniversalFn<UniversalHandler<In>, ExportedHandlerFetchHandler>;
};

export type CloudflarePagesFunction<In extends Universal.Context, Out extends Universal.Context> = UniversalFn<
  UniversalMiddleware<In, Out>,
  PagesFunction<unknown, string, { [contextSymbol]?: In }>
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
        // A new context per request: env is shared across requests
        const universalContext = {} as InContext;
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
      // context.data is per request (env is shared across requests), and Pages functions share it
      const universalContext = initContext<InContext>(context.data);
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
        // biome-ignore lint/suspicious/noExplicitAny: ignored
        setContext(context.data, response as any);
        return await context.next();
      }

      return await context.next();
    });
  };
}

function initContext<Context extends Universal.Context = Universal.Context>(data: {
  [contextSymbol]?: Context;
}): Context {
  data[contextSymbol] ??= {} as Context;
  return data[contextSymbol];
}

/**
 * The Universal context of a Cloudflare Pages request, as set by the functions before this one
 */
export function getContext<Context extends Universal.Context = Universal.Context>(context: { data: object }): Context {
  return (context.data as { [contextSymbol]?: Context })[contextSymbol] as Context;
}

function setContext<Context extends Universal.Context = Universal.Context>(
  data: { [contextSymbol]?: Context },
  value: Context,
): void {
  data[contextSymbol] = value;
}

export function getRuntime(env: unknown, ctx: ExecutionContext): RuntimeAdapter;
export function getRuntime(context: EventContext<unknown, string, unknown>): RuntimeAdapter;
export function getRuntime(
  ...args: [EventContext<unknown, string, unknown>] | [unknown, ExecutionContext]
): RuntimeAdapter {
  const isContext = args.length === 1;
  // workerd methods throw "Illegal invocation" when called on another `this`
  const ctx = isContext ? args[0] : args[1];

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
        waitUntil: ctx.waitUntil?.bind(ctx),
        passThroughOnException: ctx.passThroughOnException?.bind(ctx),
      },
    },
  );
}
