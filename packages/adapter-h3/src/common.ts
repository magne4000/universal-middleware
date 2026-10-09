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
  isBodyInit,
  mergeHeadersInto,
  nodeHeadersToWeb,
  universalSymbol,
} from "@universal-middleware/core";
import {
  createError,
  defineResponseMiddleware,
  type EventHandler,
  eventHandler,
  getResponseHeaders,
  getResponseStatus,
  getResponseStatusText,
  type H3Event,
  isStream,
  MIMES,
  sendWebResponse,
  toWebRequest,
} from "h3";

export type H3Handler<In extends Universal.Context> = UniversalFn<UniversalHandler<In>, EventHandler>;
export type H3Middleware<In extends Universal.Context, Out extends Universal.Context> = UniversalFn<
  UniversalMiddleware<In, Out>,
  EventHandler
>;

const pendingMiddlewaresSymbol = Symbol.for("unPendingMiddlewares");
const wrappedResponseSymbol = Symbol.for("unWrappedResponse");

declare module "h3" {
  interface H3EventContext {
    [contextSymbol]?: Universal.Context;
    [wrappedResponseSymbol]?: boolean;
    [pendingMiddlewaresSymbol]?: ((response: Response) => Awaitable<Response | undefined>)[];
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

// `ReadableStream.from` is missing on Bun. A stream with an encoding emits strings: a response function reads bytes
function toWebStream(iterable: AsyncIterable<Uint8Array | string>): ReadableStream<Uint8Array> {
  const iterator = iterable[Symbol.asyncIterator]();
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { value, done } = await iterator.next();
      if (done) controller.close();
      else controller.enqueue(typeof value === "string" ? encoder.encode(value) : value);
    },
    async cancel() {
      // A source waiting for data keeps `iterator.next()` pending, which `return()` queues behind: destroy it first
      (iterable as { destroy?: () => void }).destroy?.();
      await iterator.return?.();
    },
  });
}

// What h3 sends for a value that isn't a Response, as h3's own `handleHandlerResponse` (not exported) converts it
async function toPayload(value: unknown): Promise<{ body: BodyInit | null; type?: string }> {
  if (typeof value === "string") return { body: value, type: MIMES.html };
  if (isBodyInit(value)) return { body: value };
  if (isStream(value)) return { body: toWebStream(value as AsyncIterable<Uint8Array | string>) };
  const { arrayBuffer } = value as { arrayBuffer?: unknown };
  if (typeof arrayBuffer === "function") return { body: await arrayBuffer.call(value), type: (value as Blob).type };
  if (typeof value === "object" || typeof value === "boolean" || typeof value === "number") {
    return { body: JSON.stringify(value), type: MIMES.json };
  }
  if (typeof value === "bigint") return { body: value.toString(), type: MIMES.json };
  throw createError({ statusCode: 500, statusMessage: `[h3] Cannot send ${typeof value} as response.` });
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
    } else {
      const { body, type } = await toPayload(response.body);
      const headers = nodeHeadersToWeb(getResponseHeaders(event));
      const status = getResponseStatus(event);
      // As h3 sends it: no default type with 304, and no body with a status that can't have one (`Response` throws)
      if (type && status !== 304 && !headers.has("content-type")) headers.set("content-type", type);
      response.body = new Response(status === 204 || status === 205 || status === 304 ? null : body, {
        headers,
        // h3 answers `null` with 204 unless a status was set
        status: body === null && status === 200 ? 204 : status,
        statusText: getResponseStatusText(event),
      });
    }

    const middlewares = event.context[pendingMiddlewaresSymbol];
    delete event.context[pendingMiddlewaresSymbol];

    if (response.body) {
      const newResponse = await middlewares?.reduce(
        async (prev, curr) => {
          const p = await prev;
          const newR = await curr(p);
          cancelReplacedBody(p, newR);
          return newR ?? p;
        },
        Promise.resolve(response.body as Response),
      );

      if (newResponse) {
        // Nothing is sent for HEAD: the replaced body is released now, not after `cancelReplacedBody`'s delay
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
          [universalSymbol]: UniversalMiddleware<InContext, OutContext>;
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

function initContext<Context extends Universal.Context>(event: H3Event): Context {
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
