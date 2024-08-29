import type {
  Get,
  UniversalHandler,
  UniversalMiddleware,
} from "@universal-middleware/core";
import { getAdapterRuntime } from "@universal-middleware/core";
import type {
  EventContext,
  ExportedHandlerFetchHandler,
  PagesFunction,
  Request as CloudflareRequest,
  Response as CloudflareResponse,
} from "@cloudflare/workers-types";

export type CloudflareHandler<C extends Universal.Context> = {
  fetch: ExportedHandlerFetchHandler<C>;
};

export const contextSymbol = Symbol("unContext");

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
        const universalContext = initContext<C>(request);
        const response = await handler(
          request as unknown as Request,
          universalContext,
          getAdapterRuntime(
            "other",
            {},
            {
              env,
              ctx,
            },
          ),
        );

        return response as unknown as CloudflareResponse;
      },
    };
  };
}

/**
 * Creates a function handler for Cloudflare Pages
 */
export function createPageFunction<
  T extends unknown[],
  InContext extends Universal.Context,
>(
  middlewareFactory: Get<T, UniversalHandler<InContext>>,
): Get<T, PagesFunction<InContext>>;
export function createPageFunction<
  T extends unknown[],
  InContext extends Universal.Context,
  OutContext extends Universal.Context,
>(
  middlewareFactory: Get<T, UniversalMiddleware<InContext, OutContext>>,
): Get<T, PagesFunction<InContext>>;
export function createPageFunction<
  T extends unknown[],
  InContext extends Universal.Context,
  OutContext extends Universal.Context,
>(
  middlewareFactory: Get<T, UniversalMiddleware<InContext, OutContext>>,
): Get<T, PagesFunction<InContext>> {
  return (...args) => {
    const middleware = middlewareFactory(...args);

    return async (context) => {
      const universalContext = initContext<InContext>(context);
      const response = await middleware(
        context.request as unknown as Request,
        universalContext,
        getAdapterRuntime(
          "other",
          {},
          {
            env: context.env,
            ctx: {
              waitUntil: context.waitUntil,
              passThroughOnException: context.passThroughOnException,
            },
          },
        ),
      );

      if (typeof response === "function") {
        const cloudflareResponse = await context.next();
        const res = await response(cloudflareResponse as unknown as Response);
        return (res ?? cloudflareResponse) as unknown as CloudflareResponse;
      } else if (response !== null && typeof response === "object") {
        if (response instanceof Response) {
          return response as unknown as CloudflareResponse;
        }
        // Update context
        setContext(context, response);
        return await context.next();
      }

      return await context.next();
    };
  };
}

function initContext<Context extends Universal.Context = Universal.Context>(
  request:
    | Request
    | CloudflareRequest
    | EventContext<{}, string, { [contextSymbol]?: Context }>,
): Context {
  if (request instanceof Request || contextSymbol in request) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (request as any)[contextSymbol] ??= {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (request as any)[contextSymbol];
  }
  if ("data" in request) {
    request.data[contextSymbol] ??= {} as Context;
    return request.data[contextSymbol];
  }
  throw new TypeError(
    "initContext argument must be a Request or an EventContext",
  );
}

export function getContext<
  Context extends Universal.Context = Universal.Context,
>(
  request:
    | Request
    | CloudflareRequest
    | EventContext<{}, string, { [contextSymbol]?: Context }>,
): Context | undefined {
  if (request instanceof Request || contextSymbol in request) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (request as any)[contextSymbol] as Context | undefined;
  }
  if ("data" in request) {
    return request.data[contextSymbol];
  }
  throw new TypeError(
    "getContext argument must be a Request or an EventContext",
  );
}

function setContext<Context extends Universal.Context = Universal.Context>(
  request:
    | Request
    | CloudflareRequest
    | EventContext<{}, string, { [contextSymbol]?: Context }>,
  value: Context,
): void {
  if (request instanceof Request || contextSymbol in request) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (request as any)[contextSymbol] = value;
  } else if ("data" in request) {
    request.data[contextSymbol] = value;
  } else {
    throw new TypeError(
      "setContext argument must be a Request or an EventContext",
    );
  }
}
