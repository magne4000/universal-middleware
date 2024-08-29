import type { AdapterRequestContext, HattipHandler } from "@hattip/core";
import type { RequestHandler } from "@hattip/compose";
import type {
  Get,
  RuntimeAdapter,
  UniversalHandler,
  UniversalMiddleware,
} from "@universal-middleware/core";
import { getAdapterRuntime } from "@universal-middleware/core";

export const contextSymbol = Symbol("unContext");

declare module "@hattip/core" {
  interface AdapterRequestContext {
    [contextSymbol]?: Universal.Context;
  }
}

export type { HattipHandler };
export type HattipMiddleware = RequestHandler;

/**
 * Creates a request handler to be passed to hattip
 */
export function createHandler<T extends unknown[]>(
  handlerFactory: Get<T, UniversalHandler>,
): Get<T, HattipHandler> {
  return (...args) => {
    const handler = handlerFactory(...args);

    return (context) => {
      const ctx = initContext(context);
      return handler(context.request, ctx, getRuntime(context));
    };
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
): Get<T, HattipMiddleware> {
  return (...args) => {
    const middleware = middlewareFactory(...args);

    return async (context) => {
      const ctx = initContext<InContext>(context);
      const response = await middleware(
        context.request,
        ctx,
        getRuntime(context),
      );

      if (typeof response === "function") {
        const res = await context.next();
        return response(res);
      } else if (response !== null && typeof response === "object") {
        if (response instanceof Response) {
          return response;
        }

        // Update context
        context[contextSymbol] = response;
      }
    };
  };
}

export function initContext<
  InContext extends Universal.Context = Universal.Context,
>(context: AdapterRequestContext): InContext {
  context[contextSymbol] ??= {};

  return context[contextSymbol] as InContext;
}

export function getContext<
  InContext extends Universal.Context = Universal.Context,
>(context: AdapterRequestContext): InContext | undefined {
  return context[contextSymbol] as InContext | undefined;
}

export function getRuntime(context: AdapterRequestContext): RuntimeAdapter {
  return getAdapterRuntime(
    "other",
    {},
    {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      env: (context.platform as any)?.env,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ctx: (context.platform as any)?.context,
    },
  );
}
