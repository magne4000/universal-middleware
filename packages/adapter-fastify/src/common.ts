import type { IncomingMessage } from "node:http";
import {
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

export const pendingMiddlewaresSymbol = Symbol.for("unPendingMiddlewares");
export const wrappedResponseSymbol = Symbol.for("unWrappedResponse");

export type FastifyHandler<In extends Universal.Context> = UniversalFn<UniversalHandler<In>, RouteHandlerMethod>;
export type FastifyMiddleware<In extends Universal.Context, Out extends Universal.Context> = UniversalFn<
  UniversalMiddleware<In, Out>,
  FastifyPluginAsync
>;

declare module "fastify" {
  export interface FastifyRequest {
    [pendingMiddlewaresSymbol]?: ((
      response: Response,
    ) => Response | Promise<Response | undefined> | undefined | Promise<undefined>)[];
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
  const ret = new Headers();
  const headers = reply.getHeaders();

  let setCookie = reply.getHeader("set-cookie");
  if (typeof setCookie === "string") {
    setCookie = [setCookie];
  }
  if (Array.isArray(setCookie)) {
    for (const cookie of setCookie) {
      ret.append("set-cookie", cookie);
    }
  }

  for (const [key, value] of Object.entries(headers)) {
    if (key === "set-cookie") continue;
    if (typeof value === "string") {
      ret.set(key, value);
    } else if (typeof value === "number") {
      ret.set(key, String(value));
    } else if (Array.isArray(value)) {
      if (value.length === 1) {
        ret.set(key, value[0]);
      } else if (value.length > 1) {
        console.warn(`Header "${key}" should not be an array. Only last value will be sent`);
        // biome-ignore lint/style/noNonNullAssertion: ignored
        ret.set(key, value.at(-1)!);
      }
    }
  }

  return ret;
}

function getRawRequest(req: FastifyRequest): DecoratedRequest {
  if (req.body === undefined || "rawBody" in req.raw) return req.raw as DecoratedRequest;
  if ("rawBody" in req) {
    Object.defineProperty(req.raw, "rawBody", {
      get() {
        return req.rawBody;
      },
      configurable: true,
      enumerable: true,
    });
  } else {
    // Fastify already consumed the stream; the node adapter reads the parsed body from here
    Object.defineProperty(req.raw, "body", { value: req.body, configurable: true, enumerable: true });
  }

  return req.raw;
}

export function createHandler<T extends unknown[], InContext extends Universal.Context>(
  handlerFactory: Get<T, UniversalHandler<InContext>>,
): Get<T, FastifyHandler<InContext>> {
  const requestAdapter = createRequestAdapter();

  return (...args) => {
    const handler = handlerFactory(...args);

    return bindUniversal(handler, async function universalHandlerFastify(request, reply) {
      const ctx = initContext<InContext>(request);
      const response: Response | undefined = await this[universalSymbol](
        requestAdapter(getRawRequest(request), reply.raw),
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
): Get<T, FastifyMiddleware<InContext, OutContext>> {
  const requestAdapter = createRequestAdapter();

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
                requestAdapter(getRawRequest(request), reply.raw),
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

          if (payload instanceof Response) {
            mergeHeadersInto(payload.headers, getHeaders(reply));
          } else if (payload === undefined || isBodyInit(payload)) {
            payload = new Response(payload, {
              headers: new Headers(getHeaders(reply)),
              status: reply.statusCode,
            });
          } else {
            throw new TypeError("Payload is not a Response or BodyInit compatible");
          }

          const middlewares = request[pendingMiddlewaresSymbol];
          delete request[pendingMiddlewaresSymbol];

          const newResponse = await middlewares?.reduce(
            async (prev, curr) => {
              const p = await prev;
              const newR = await curr(p);
              cancelReplacedBody(p, newR);
              return newR ?? p;
            },
            Promise.resolve(payload as Response),
          );

          const r = (newResponse ?? payload) as Response;
          if (request.method === "HEAD") {
            // Fastify's head route runs after this hook and only accepts a string, a buffer or a stream
            reply.code(r.status);
            for (const [name, value] of r.headers) {
              reply.header(name, value);
            }
            // An idle stream would keep the HEAD response open
            void r.body?.cancel().catch(() => {});
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

export function setContext<InContext extends Universal.Context = Universal.Context>(
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
