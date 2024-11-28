import type { RequestHandler } from "@hattip/compose";
import type { AdapterRequestContext, HattipHandler as _HattipHandler } from "@hattip/core";
import type {
  Get,
  RuntimeAdapter,
  UniversalFn,
  UniversalHandler,
  UniversalMiddleware,
} from "@universal-middleware/core";
import { bindUniversal, getAdapterRuntime, universalSymbol } from "@universal-middleware/core";

export const contextSymbol = Symbol.for("unContext");

declare module "@hattip/core" {
  interface AdapterRequestContext {
    [contextSymbol]?: Universal.Context;
  }
}

export type HattipHandler<In extends Universal.Context> = UniversalFn<UniversalHandler<In>, _HattipHandler>;
export type HattipMiddleware<In extends Universal.Context, Out extends Universal.Context> = UniversalFn<
  UniversalMiddleware<In, Out>,
  RequestHandler
>;

/**
 * Creates a request handler to be passed to hattip
 */
export function createHandler<T extends unknown[], InContext extends Universal.Context>(
  handlerFactory: Get<T, UniversalHandler<InContext>>,
): Get<T, HattipHandler<InContext>> {
  return (...args) => {
    const handler = handlerFactory(...args);

    return bindUniversal(handler, function universalHandlerHattip(context) {
      const ctx = initContext<InContext>(context);
      return this[universalSymbol](context.request, ctx, getRuntime(context));
    });
  };
}

/**
 * Creates a middleware to be passed to @hattip/compose or @hattip/router
 */
export function createMiddleware<
  T extends unknown[],
  InContext extends Universal.Context,
  OutContext extends Universal.Context,
>(
  middlewareFactory: Get<T, UniversalMiddleware<InContext, OutContext>>,
): Get<T, HattipMiddleware<InContext, OutContext>> {
  return (...args) => {
    const middleware = middlewareFactory(...args);

    return bindUniversal(middleware, async function universalMiddlewareHattip(context) {
      const ctx = initContext<InContext>(context);
      const response = await this[universalSymbol](context.request, ctx, getRuntime(context));

      if (typeof response === "function") {
        const res = await context.next();
        return response(res);
      }
      if (response !== null && typeof response === "object") {
        if (response instanceof Response) {
          return response;
        }

        // Update context
        context[contextSymbol] = response;
      }
    });
  };
}

export function initContext<InContext extends Universal.Context = Universal.Context>(
  context: AdapterRequestContext,
): InContext {
  context[contextSymbol] ??= {};

  return context[contextSymbol] as InContext;
}

export function getContext<InContext extends Universal.Context = Universal.Context>(
  context: AdapterRequestContext,
): InContext {
  return context[contextSymbol] as InContext;
}

export function getRuntime(context: AdapterRequestContext): RuntimeAdapter {
  return getAdapterRuntime(
    "hattip",
    {
      params: "params" in context ? (context.params as Record<string, string>) : undefined,
    },
    {
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      env: (context.platform as any)?.env,
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      ctx: (context.platform as any)?.context,
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      req: (context.platform as any)?.request,
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      res: (context.platform as any)?.response,
    },
  );
}
