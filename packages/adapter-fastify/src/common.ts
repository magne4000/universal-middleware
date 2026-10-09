import type { IncomingMessage } from "node:http";
import { Readable } from "node:stream";
import {
  type Awaitable,
  attachUniversal,
  bindUniversal,
  cancelReplacedBody,
  contextSymbol,
  type Get,
  getAdapterRuntime,
  isBodyInit,
  mergeHeadersInto,
  type RuntimeAdapter,
  type UniversalFn,
  type UniversalHandler,
  type UniversalMiddleware,
  universalSymbol,
} from "@universal-middleware/core";

import { createRequestAdapter, type DecoratedRequest } from "@universal-middleware/node";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest, RouteHandlerMethod } from "fastify";
import fp from "fastify-plugin";

const pendingMiddlewaresSymbol = Symbol.for("unPendingMiddlewares");
const wrappedResponseSymbol = Symbol.for("unWrappedResponse");
// The Fetch standard's null body statuses: a Response with one of them can't have a body
const nullBodyStatuses = new Set([101, 103, 204, 205, 304]);

export type FastifyHandler<In extends Universal.Context> = UniversalFn<UniversalHandler<In>, RouteHandlerMethod>;

/** Adapter options */
export interface FastifyAdapterOptions {
  /**
   * Set the origin part of the request URL to a constant value. It defaults to `process.env.ORIGIN`.
   * Otherwise the protocol and host are Fastify's `request.protocol` and `request.host`, which follow its `trustProxy`
   * option. `process.env.TRUST_PROXY=1` still makes the `X-Forwarded-*` and `Forwarded` headers win.
   */
  origin?: string;
}
export type FastifyMiddleware<In extends Universal.Context, Out extends Universal.Context> = UniversalFn<
  UniversalMiddleware<In, Out>,
  FastifyPluginAsync
>;

declare module "fastify" {
  export interface FastifyRequest {
    [pendingMiddlewaresSymbol]?: ((response: Response) => Awaitable<Response | undefined>)[];
    [wrappedResponseSymbol]?: boolean;
    [contextSymbol]?: unknown;
  }
}

function patchBody(response: Response) {
  // Fastify currently doesn't send a response for body is null.
  // To mimic express behavior, we convert the body to an empty ReadableStream.
  Object.defineProperty(response, "body", {
    value: new ReadableStream({
      start(controller) {
        controller.close();
      },
    }),
    writable: false,
    configurable: true,
  });

  return response;
}

// A HEAD response has no body, and an endless one (SSE, a proxied stream) would
// keep Fastify from ever finishing the response. Headers and status are kept.
// Pending response functions may still read the body, so they run first.
function withoutHeadBody(request: FastifyRequest, response: Response): Response {
  if (request.method !== "HEAD" || !response.body || request[pendingMiddlewaresSymbol]?.length) return response;
  void response.body.cancel().catch(() => {});
  return new Response(null, response);
}

function getHeaders(reply: FastifyReply): Headers {
  const headers = new Headers();
  for (const [name, value] of Object.entries(reply.getHeaders())) {
    // A list (several cookies, `reply.header("link", [a, b])`) holds several values of the same header
    if (Array.isArray(value)) {
      for (const item of value) headers.append(name, item);
    } else if (value !== undefined) {
      headers.set(name, String(value));
    }
  }
  return headers;
}

function getRawRequest(req: FastifyRequest): DecoratedRequest {
  const raw: DecoratedRequest = req.raw;
  if (req.body === undefined || "rawBody" in raw) return raw;
  if ("rawBody" in req) {
    Object.defineProperty(raw, "rawBody", {
      get() {
        return req.rawBody;
      },
      configurable: true,
      enumerable: true,
    });
  } else {
    // Fastify already consumed the stream; the node adapter reads the parsed body from here
    Object.defineProperty(raw, "body", { value: req.body, configurable: true, enumerable: true });
  }

  return raw;
}

export function createHandler<T extends unknown[], InContext extends Universal.Context>(
  handlerFactory: Get<T, UniversalHandler<InContext>>,
  options: FastifyAdapterOptions = {},
): Get<T, FastifyHandler<InContext>> {
  const requestAdapter = createRequestAdapter({ origin: options.origin });

  return (...args) => {
    const handler = handlerFactory(...args);

    return bindUniversal(handler, async function universalHandlerFastify(request, reply) {
      const ctx = initContext<InContext>(request);
      const response: Response | undefined = await this[universalSymbol](
        // The URL has the protocol and host Fastify gives the request, from its `trustProxy` option
        requestAdapter(getRawRequest(request), reply.raw, { protocol: request.protocol, host: request.host }),
        ctx,
        getRuntime(request, reply),
      );

      if (response) {
        const toSend = withoutHeadBody(request, response);
        if (!toSend.body) {
          patchBody(toSend);
        }

        return reply.send(toSend);
      }

      return reply.callNotFound();
    });
  };
}

export function createMiddleware<
  T extends unknown[],
  InContext extends Universal.Context,
  OutContext extends Universal.Context,
>(
  middlewareFactory: Get<T, UniversalMiddleware<InContext, OutContext>>,
  options: FastifyAdapterOptions = {},
): Get<T, FastifyMiddleware<InContext, OutContext>> {
  const requestAdapter = createRequestAdapter({ origin: options.origin });

  return (...args) => {
    const middleware = middlewareFactory(...args);

    return attachUniversal(
      middleware,
      fp(async (instance) => {
        instance.addHook(
          "preHandler",
          bindUniversal(
            middleware,
            async function universalMiddlewareFastify(request: FastifyRequest, reply: FastifyReply) {
              const ctx = initContext<InContext>(request);
              const response = await this[universalSymbol](
                requestAdapter(getRawRequest(request), reply.raw, { protocol: request.protocol, host: request.host }),
                ctx,
                getRuntime(request, reply),
              );

              if (!response) {
                return;
              }
              if (typeof response === "function") {
                if (reply.sent) {
                  throw new Error(
                    "Universal Middleware called after headers have been sent. Please open an issue at https://github.com/magne4000/universal-middleware",
                  );
                }
                request[pendingMiddlewaresSymbol] ??= [];
                request[wrappedResponseSymbol] = false;
                // `wrapResponse` takes care of calling those middlewares right before sending the response
                request[pendingMiddlewaresSymbol].push(response);
              } else if (response instanceof Response) {
                const toSend = withoutHeadBody(request, response);
                if (!toSend.body) {
                  patchBody(toSend);
                }

                await reply.send(toSend);
              } else {
                setContext(request, response);
              }
            },
          ),
        );

        instance.addHook("onSend", async (request, reply, payload) => {
          if (request[wrappedResponseSymbol] !== false) return payload;
          request[wrappedResponseSymbol] = true;

          let response: Response;
          if (payload instanceof Response) {
            // Merged into a new Response: the handler's may have immutable headers, as `Response.redirect()` and
            // `fetch()` give theirs
            response = new Response(nullBodyStatuses.has(payload.status) ? null : payload.body, {
              status: payload.status,
              statusText: payload.statusText,
              headers: mergeHeadersInto(new Headers(payload.headers), getHeaders(reply)),
            });
            if (!response.body) patchBody(response);
          } else if (payload === undefined || isBodyInit(payload) || payload instanceof Readable) {
            // A route sends a file, or a proxied body, as a Node stream. The cast only bridges the types:
            // `node:stream/web` declares the global `ReadableStream` apart from the DOM's, which `Response` takes.
            const body =
              payload instanceof Readable
                ? (Readable.toWeb(payload) as unknown as ReadableStream<Uint8Array>)
                : payload;
            response = new Response(body, {
              headers: getHeaders(reply),
              status: reply.statusCode,
            });
          } else {
            throw new TypeError("Payload is not a Response, a Node stream or BodyInit compatible");
          }

          const middlewares = request[pendingMiddlewaresSymbol];
          delete request[pendingMiddlewaresSymbol];

          const newResponse = await middlewares?.reduce(async (prev, curr) => {
            const p = await prev;
            const newR = await curr(p);
            cancelReplacedBody(p, newR);
            return newR ?? p;
          }, Promise.resolve(response));

          const r = newResponse ?? response;
          if (request.method === "HEAD") {
            // Fastify's head route runs after this hook and only accepts a string, a buffer or a stream
            reply.code(r.status);
            for (const [name, value] of r.headers) {
              reply.header(name, value);
            }
            // An idle stream would keep the HEAD response open
            void r.body?.cancel().catch(() => {});
            // Nothing is sent for HEAD: the replaced body is released now, not after `cancelReplacedBody`'s delay
            if (r !== response) void response.body?.cancel().catch(() => {});
            // `undefined` would keep the previous payload, `null` breaks Fastify's own HEAD hook, and a string
            // makes Fastify send `content-length: 0`. An empty stream keeps the content-length of `r`, if any.
            return new ReadableStream({ start: (controller) => controller.close() });
          } else {
            return r;
          }
        });
      }),
    );
  };
}

function initContext<InContext extends Universal.Context = Universal.Context>(req: FastifyRequest): InContext {
  req[contextSymbol] ??= {};
  return req[contextSymbol] as InContext;
}

export function getContext<InContext extends Universal.Context = Universal.Context>(req: FastifyRequest): InContext {
  return req[contextSymbol] as InContext;
}

function setContext<InContext extends Universal.Context = Universal.Context>(
  req: FastifyRequest,
  newContext: InContext,
): void {
  req[contextSymbol] = newContext;
}

export function getRuntime(request: FastifyRequest, reply: FastifyReply): RuntimeAdapter {
  return getAdapterRuntime("fastify", {
    params: request.params as Record<string, string> | undefined,
    req: request.raw as IncomingMessage,
    res: reply.raw,
    fastify: Object.freeze({
      request: request,
      reply: reply,
    }),
  });
}
