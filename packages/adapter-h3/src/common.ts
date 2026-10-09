import type {
  Get,
  RuntimeAdapter,
  UniversalFn,
  UniversalHandler,
  UniversalMiddleware,
} from "@universal-middleware/core";
import {
  bindUniversal,
  contextSymbol,
  getAdapterRuntime,
  isBodyInit,
  mergeHeadersInto,
  nodeHeadersToWeb,
  universalSymbol,
} from "@universal-middleware/core";
import {
  defineResponseMiddleware,
  type EventHandler,
  eventHandler,
  getResponseHeaders,
  getResponseStatus,
  getResponseStatusText,
  type H3Event,
  sendWebResponse,
  toWebRequest,
} from "h3";

export type H3Handler<In extends Universal.Context> = UniversalFn<UniversalHandler<In>, EventHandler>;
export type H3Middleware<In extends Universal.Context, Out extends Universal.Context> = UniversalFn<
  UniversalMiddleware<In, Out>,
  EventHandler
>;

export const pendingMiddlewaresSymbol = Symbol.for("unPendingMiddlewares");
export const wrappedResponseSymbol = Symbol.for("unWrappedResponse");

declare module "h3" {
  interface H3EventContext {
    [contextSymbol]?: Universal.Context;
    [wrappedResponseSymbol]?: boolean;
    [pendingMiddlewaresSymbol]?: ((
      response: Response,
    ) => Response | Promise<Response> | undefined | Promise<undefined>)[];
  }
}

function memToWebRequest(event: H3Event): Request {
  if (!event.web?.request) {
    event.web ??= {};
    event.web.request = toWebRequest(event);
  }

  return event.web.request;
}

// A HEAD response has no body, and an endless one (SSE, a proxied stream) would
// keep h3 from ever finishing the response. Headers and status are kept.
// Pending response functions may still read the body, so they run first.
function withoutHeadBody(event: H3Event, response: Response): Response {
  if (event.method !== "HEAD" || !response.body || event.context[pendingMiddlewaresSymbol]?.length) return response;
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
      eventHandler(async function universalHandlerH3(
        this: {
          [universalSymbol]: UniversalHandler<InContext>;
        },
        event,
      ) {
        const ctx = initContext<InContext>(event);
        const response = await this[universalSymbol](memToWebRequest(event), ctx, getRuntime(event));
        return response instanceof Response ? withoutHeadBody(event, response) : response;
      }),
      eventHandler,
    );
  };
}

export const universalOnBeforeResponse = defineResponseMiddleware(
  async (
    event: H3Event,
    response: {
      body?: unknown;
    },
  ) => {
    if (response.body instanceof Error) return;
    if (event.context[wrappedResponseSymbol] !== false) return;
    event.context[wrappedResponseSymbol] = true;

    if (response.body instanceof Response) {
      mergeHeadersInto(response.body.headers, nodeHeadersToWeb(getResponseHeaders(event)));
    } else if (isBodyInit(response.body)) {
      response.body = new Response(response.body, {
        headers: nodeHeadersToWeb(getResponseHeaders(event)),
        status: getResponseStatus(event),
        statusText: getResponseStatusText(event),
      });
    } else {
      throw new TypeError("Payload is not a Response or BodyInit compatible");
    }

    const middlewares = event.context[pendingMiddlewaresSymbol];
    delete event.context[pendingMiddlewaresSymbol];

    if (response.body) {
      const newResponse = await middlewares?.reduce(
        async (prev, curr) => {
          const p = await prev;
          const newR = await curr(p);
          return newR ?? p;
        },
        Promise.resolve(response.body as Response),
      );

      if (newResponse) {
        // A replaced HEAD body is never read, and an endless one would never be released
        if (event.method === "HEAD" && newResponse !== response.body) {
          void (response.body as Response).body?.cancel().catch(() => {});
        }
        await sendWebResponse(event, withoutHeadBody(event, newResponse));
      }
    }
  },
);

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
      eventHandler(async function universalMiddlewareH3(
        this: {
          [universalSymbol]: UniversalHandler<InContext>;
        },
        event,
      ) {
        const ctx = initContext<InContext>(event);
        const response = await this[universalSymbol](memToWebRequest(event), ctx, getRuntime(event));

        if (typeof response === "function") {
          event.context[pendingMiddlewaresSymbol] ??= [];
          event.context[wrappedResponseSymbol] = false;
          // `wrapResponse` takes care of calling those middlewares right before sending the response
          event.context[pendingMiddlewaresSymbol].push(response);
        } else if (response !== null && typeof response === "object") {
          if (response instanceof Response) {
            return withoutHeadBody(event, response);
          }
          // Update context
          event.context[contextSymbol] = response;
        }
      }),
      eventHandler,
    );
  };
}

export function initContext<Context extends Universal.Context>(event: H3Event): Context {
  event.context[contextSymbol] ??= {};
  return event.context[contextSymbol] as Context;
}

export function getContext<Context extends Universal.Context>(event: H3Event): Context {
  return event.context[contextSymbol] as Context;
}

export function getRuntime(event: H3Event): RuntimeAdapter {
  return getAdapterRuntime(
    "h3",
    {
      params: event.context.params,
      h3: event,
    },
    {
      ...event.context.cloudflare,
      req: event.node.req,
      res: event.node.res,
    },
    memToWebRequest(event),
  );
}
