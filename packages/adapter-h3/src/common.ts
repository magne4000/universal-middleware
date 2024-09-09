import type { Get, UniversalHandler, UniversalMiddleware } from "@universal-middleware/core";
import { getAdapterRuntime, isBodyInit, mergeHeadersInto, nodeHeadersToWeb } from "@universal-middleware/core";
import {
  defineResponseMiddleware,
  eventHandler,
  type EventHandler,
  getResponseHeaders,
  getResponseStatus,
  getResponseStatusText,
  type H3Event,
  sendWebResponse,
  toWebRequest,
} from "h3";

export type H3Handler = EventHandler;
export type H3Middleware = EventHandler;

export const contextSymbol = Symbol("unContext");
export const pendingMiddlewaresSymbol = Symbol("unPendingMiddlewares");
export const wrappedResponseSymbol = Symbol("unWrappedResponse");

declare module "h3" {
  interface H3EventContext {
    [contextSymbol]?: Universal.Context;
    [wrappedResponseSymbol]?: boolean;
    [pendingMiddlewaresSymbol]?: ((
      response: Response,
    ) => Response | Promise<Response> | undefined | Promise<undefined>)[];
  }
}

/**
 * Creates a request handler to be passed to app.all() or any other route function
 */
export function createHandler<T extends unknown[]>(handlerFactory: Get<T, UniversalHandler>): Get<T, H3Handler> {
  return (...args) => {
    const handler = handlerFactory(...args);

    return eventHandler((event) => {
      const ctx = initContext(event);
      return handler(toWebRequest(event), ctx, getAdapterRuntime("other", {}));
    });
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
    const newResponse = await middlewares?.reduce(
      async (prev, curr) => {
        const p = await prev;
        const newR = await curr(p);
        return newR ?? p;
      },
      Promise.resolve(response.body as Response),
    );

    if (newResponse) {
      sendWebResponse(event, newResponse);
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
>(middlewareFactory: Get<T, UniversalMiddleware<InContext, OutContext>>): Get<T, H3Middleware> {
  return (...args) => {
    const middleware = middlewareFactory(...args);

    return eventHandler(async (event) => {
      const ctx = initContext<InContext>(event);
      const response = await middleware(toWebRequest(event), ctx, getAdapterRuntime("other", {}));

      if (typeof response === "function") {
        event.context[pendingMiddlewaresSymbol] ??= [];
        event.context[wrappedResponseSymbol] = false;
        // `wrapResponse` takes care of calling those middlewares right before sending the response
        event.context[pendingMiddlewaresSymbol].push(response);
      } else if (response !== null && typeof response === "object") {
        if (response instanceof Response) {
          return sendWebResponse(event, response);
        }
        // Update context
        event.context[contextSymbol] = response;
      }
    });
  };
}

export function initContext<Context extends Universal.Context>(event: H3Event): Context {
  event.context[contextSymbol] ??= {};
  return event.context[contextSymbol] as Context;
}

export function getContext<Context extends Universal.Context>(event: H3Event): Context {
  return event.context[contextSymbol] as Context;
}
