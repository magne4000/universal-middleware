import type { RequestHandler } from "@hattip/compose";
import type { AdapterRequestContext, HattipHandler as _HattipHandler } from "@hattip/core";
import type {
  Get,
  RuntimeAdapter,
  UniversalFn,
  UniversalHandler,
  UniversalMiddleware,
} from "@universal-middleware/core";
import { bindUniversal, contextSymbol, getAdapterRuntime, universalSymbol } from "@universal-middleware/core";

// Number of response functions waiting for the response of `context.next()`
const pendingMiddlewaresSymbol = Symbol.for("unPendingMiddlewares");

declare module "@hattip/core" {
  interface AdapterRequestContext {
    [contextSymbol]?: Universal.Context;
    [pendingMiddlewaresSymbol]?: number;
  }
}

// A HEAD response has no body, but `@hattip/adapter-node` pipes it to the end, so an endless one (SSE, a proxied
// stream) never completes. Headers and status are kept. Bun and Deno already cancel it themselves.
// Response functions waiting for this response may still read the body, so they run first.
function withoutHeadBody(context: AdapterRequestContext, response: Response): Response {
  if (
    context.request.method !== "HEAD" ||
    !response.body ||
    (context.platform as { name?: string } | undefined)?.name !== "node" ||
    context[pendingMiddlewaresSymbol]
  ) {
    return response;
  }
  void response.body.cancel().catch(() => {});
  // Not `null`: `@hattip/adapter-node` would then send `content-length: 0` over the one of `response`
  return new Response(new ReadableStream({ start: (controller) => controller.close() }), response);
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

    return bindUniversal(handler, async function universalHandlerHattip(context) {
      const ctx = initContext<InContext>(context);
      const response = await this[universalSymbol](context.request, ctx, getRuntime(context));
      return response instanceof Response ? withoutHeadBody(context, response) : response;
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
        const pending = context[pendingMiddlewaresSymbol] ?? 0;
        context[pendingMiddlewaresSymbol] = pending + 1;
        let res: Response;
        let actualRes: Response | undefined;
        try {
          res = await context.next();
          actualRes = await response(res);
        } finally {
          context[pendingMiddlewaresSymbol] = pending;
        }
        // A replaced HEAD body is never read, and an endless one would never be released
        if (actualRes && actualRes !== res && context.request.method === "HEAD") {
          void res.body?.cancel().catch(() => {});
        }
        return withoutHeadBody(context, actualRes ?? res);
      }
      if (response !== null && typeof response === "object") {
        if (response instanceof Response) {
          return withoutHeadBody(context, response);
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
      hattip: context,
    },
    {
      // biome-ignore lint/suspicious/noExplicitAny: ignored
      env: (context.platform as any)?.env,
      // biome-ignore lint/suspicious/noExplicitAny: ignored
      ctx: (context.platform as any)?.context,
      // biome-ignore lint/suspicious/noExplicitAny: ignored
      req: (context.platform as any)?.request,
      // biome-ignore lint/suspicious/noExplicitAny: ignored
      res: (context.platform as any)?.response,
    },
    context.request,
  );
}
