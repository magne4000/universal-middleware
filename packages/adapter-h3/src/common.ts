import type {
  Awaitable,
  Get,
  RuntimeAdapter,
  UniversalFn,
  UniversalHandler,
  UniversalMiddleware,
} from "@universal-middleware/core";
import {
  bindUniversal,
  cancelReplacedBody,
  contextSymbol,
  getAdapterRuntime,
  keepBody,
  universalSymbol,
  withMutableHeaders,
} from "@universal-middleware/core";
import { defineHandler, type EventHandler, type H3Event, type Middleware, toResponse } from "h3";

export type H3Handler<In extends Universal.Context> = UniversalFn<UniversalHandler<In>, EventHandler>;
export type H3Middleware<In extends Universal.Context, Out extends Universal.Context> = UniversalFn<
  UniversalMiddleware<In, Out>,
  Middleware
>;

// The response functions of a request, applied in registration order by the middleware that returned the first one
const pendingMiddlewaresSymbol = Symbol.for("unPendingMiddlewares");

declare module "h3" {
  interface H3EventContext {
    [contextSymbol]?: Universal.Context;
    [pendingMiddlewaresSymbol]?: ((response: Response) => Awaitable<Response | undefined>)[];
  }
}

// A HEAD response has no body. h3 drops it without cancelling it, and an endless one (SSE, a proxied stream) would
// keep running: it is cancelled here. Headers and status are kept. Pending response functions may still read the
// body, so they run first.
function withoutHeadBody(event: H3Event, response: Response): Response {
  if (event.req.method !== "HEAD" || !response.body || event.context[pendingMiddlewaresSymbol]?.length) return response;
  void response.body.cancel().catch(() => {});
  return new Response(null, response);
}

/**
 * Creates a request handler to be passed to app.all() or any other route function
 */
export function createHandler<T extends unknown[], InContext extends Universal.Context>(
  handlerFactory: Get<T, UniversalHandler<InContext>>,
): Get<T, H3Handler<InContext>> {
  return (...args) => {
    const handler = handlerFactory(...args);

    return bindUniversal(
      handler,
      async function universalHandlerH3(
        this: {
          [universalSymbol]: UniversalHandler<InContext>;
        },
        event: H3Event,
      ) {
        const ctx = initContext<InContext>(event);
        const response = await this[universalSymbol](event.req, ctx, getRuntime(event));
        return response instanceof Response ? withoutHeadBody(event, response) : response;
      },
      defineHandler,
    );
  };
}

/**
 * Creates a middleware to be passed to app.use() or any route function
 */
export function createMiddleware<
  T extends unknown[],
  InContext extends Universal.Context,
  OutContext extends Universal.Context,
>(middlewareFactory: Get<T, UniversalMiddleware<InContext, OutContext>>): Get<T, H3Middleware<InContext, OutContext>> {
  return (...args) => {
    const middleware = middlewareFactory(...args);

    return bindUniversal(
      middleware,
      async function universalMiddlewareH3(
        this: {
          [universalSymbol]: UniversalMiddleware<InContext, OutContext>;
        },
        event: H3Event,
        next: () => unknown,
      ) {
        const ctx = initContext<InContext>(event);
        keepBody(event.req);
        const response = await this[universalSymbol](event.req, ctx, getRuntime(event));

        if (typeof response === "function") {
          const pending = event.context[pendingMiddlewaresSymbol];
          if (pending) {
            pending.push(response);
            return next();
          }
          const middlewares = [response];
          event.context[pendingMiddlewaresSymbol] = middlewares;
          let original: Response;
          let res: Response;
          try {
            const value = await next();
            // A Response is kept as is: h3 would drop the body of a HEAD response, which a response function may read
            if (value instanceof Response) {
              original = value;
            } else {
              // As h3 converts the value once returned, `onResponse` excepted: h3 still calls it on the final Response
              const { onResponse: _, ...config } = event.app?.config ?? {};
              original = await toResponse(value, event, config);
            }
            res = original;
            for (const middleware of middlewares) {
              res = withMutableHeaders(res);
              const replacement = await middleware(res);
              cancelReplacedBody(res, replacement);
              res = replacement ?? res;
            }
          } finally {
            delete event.context[pendingMiddlewaresSymbol];
          }
          // Nothing is sent for HEAD: the replaced body is released now, not after `cancelReplacedBody`'s delay
          if (event.req.method === "HEAD" && res !== original) void original.body?.cancel().catch(() => {});
          return withoutHeadBody(event, res);
        }
        if (response instanceof Response) {
          return withoutHeadBody(event, response);
        }
        if (response !== null && typeof response === "object") {
          // Update context
          event.context[contextSymbol] = response;
        }
      },
    );
  };
}

function initContext<Context extends Universal.Context>(event: H3Event): Context {
  event.context[contextSymbol] ??= {};
  return event.context[contextSymbol] as Context;
}

export function getContext<Context extends Universal.Context>(event: H3Event): Context {
  return event.context[contextSymbol] as Context;
}

export function getRuntime(event: H3Event): RuntimeAdapter {
  // workerd methods throw "Illegal invocation" when called on another `this`
  const cloudflareContext = event.runtime?.cloudflare?.context;

  return getAdapterRuntime(
    "h3",
    {
      params: event.context.params,
      h3: event,
    },
    {
      env: event.runtime?.cloudflare?.env,
      ctx: {
        // `event.waitUntil` always exists, and silently does nothing where the runtime has no `waitUntil`
        waitUntil: event.req.waitUntil?.bind(event.req),
        passThroughOnException: cloudflareContext?.passThroughOnException.bind(cloudflareContext),
      },
    },
    event.req,
  );
}
