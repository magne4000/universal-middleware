import type { AdapterRequestContext, HattipHandler } from "@hattip/core";
import type { RequestHandler } from "@hattip/compose";
import type {
  Get,
  UniversalHandler,
  UniversalMiddleware,
} from "@universal-middleware/core";

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
      context[contextSymbol] ??= {};
      return handler(context.request, context[contextSymbol]);
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
      context[contextSymbol] ??= {};
      const response = await middleware(
        context.request,
        getContext<InContext>(context)!,
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

export function getContext<
  InContext extends Universal.Context = Universal.Context,
>(context: AdapterRequestContext): InContext | undefined {
  return context[contextSymbol] as InContext | undefined;
}
