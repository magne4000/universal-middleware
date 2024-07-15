import type { AdapterRequestContext, HattipHandler } from "@hattip/core";
import type { RequestHandler } from "@hattip/compose";
import type {
  UniversalHandler,
  UniversalMiddleware,
} from "@universal-middleware/core";

export const contextSymbol = Symbol("unContext");

declare module "@hattip/core" {
  interface AdapterRequestContext {
    [contextSymbol]?: Universal.Context;
  }
}

/**
 * Creates a request handler to be passed to hattip
 */
export function createHandler(handler: UniversalHandler): HattipHandler {
  return (context) => {
    context[contextSymbol] ??= {};
    return handler(context.request, context[contextSymbol]);
  };
}

/**
 * Creates a middleware to be passed to @hattip/compose or @hattip/router
 */
export function createMiddleware(
  middleware: UniversalMiddleware,
): RequestHandler {
  return async (context) => {
    context[contextSymbol] ??= {};
    const response = await middleware(context.request, context[contextSymbol]);

    if (typeof response === "function") {
      const res = await context.next();
      return response(res);
    } else if (typeof response === "object" && "body" in response) {
      return response;
    }
  };
}

export function getContext(
  context: AdapterRequestContext,
): Universal.Context | undefined {
  return context[contextSymbol];
}
