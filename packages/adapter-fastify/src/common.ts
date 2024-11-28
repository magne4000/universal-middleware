import type { IncomingMessage } from "node:http";
import type {
  Get,
  RuntimeAdapter,
  UniversalFn,
  UniversalHandler,
  UniversalMiddleware,
} from "@universal-middleware/core";
import {
  attachUniversal,
  bindUniversal,
  getAdapterRuntime,
  isBodyInit,
  mergeHeadersInto,
  universalSymbol,
} from "@universal-middleware/core";
import { type DecoratedRequest, createRequestAdapter } from "@universal-middleware/express";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest, RouteHandlerMethod } from "fastify";
import fp from "fastify-plugin";

export const contextSymbol = Symbol.for("unContext");
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
    ) => Response | Promise<Response> | undefined | Promise<undefined>)[];
    [wrappedResponseSymbol]?: boolean;
  }

  export interface FastifyContextConfig {
    [contextSymbol]: unknown;
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
        // biome-ignore lint/style/noNonNullAssertion: <explanation>
        ret.set(key, value.at(-1)!);
      }
    }
  }

  return ret;
}

function getRawRequest(req: FastifyRequest): DecoratedRequest {
  if (!req.body || "rawBody" in req.raw) return req.raw as DecoratedRequest;
  if ("rawBody" in req) {
    Object.defineProperty(req.raw, "rawBody", {
      get() {
        console.log(req.rawBody);
        return req.rawBody;
      },
      configurable: true,
      enumerable: true,
    });
  } else {
    Object.defineProperty(req.raw, "rawBody", {
      get() {
        throw new Error(
          "rawBody not Found. Please install fastify-raw-body plugin: https://github.com/Eomm/fastify-raw-body",
        );
      },
      configurable: true,
      enumerable: true,
    });
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
      const response = await this[universalSymbol](
        requestAdapter(getRawRequest(request)),
        ctx,
        getRuntime(request, reply),
      );

      if (response) {
        if (!response.body) {
          patchBody(response);
        }

        return reply.send(response);
      }
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
                requestAdapter(getRawRequest(request)),
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
                if (!response.body) {
                  patchBody(response);
                }

                reply.send(response);
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
          } else if (isBodyInit(payload)) {
            // biome-ignore lint/style/noParameterAssign: <explanation>
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
              return newR ?? p;
            },
            Promise.resolve(payload as Response),
          );

          return newResponse ?? payload;
        });
      }),
    );
  };
}

function initContext<InContext extends Universal.Context = Universal.Context>(req: FastifyRequest): InContext {
  const config = req.routeOptions.config;
  config[contextSymbol] ??= {};
  return config[contextSymbol] as InContext;
}

export function getContext<InContext extends Universal.Context = Universal.Context>(req: FastifyRequest): InContext {
  const config = req.routeOptions.config;
  return config[contextSymbol] as InContext;
}

export function setContext<InContext extends Universal.Context = Universal.Context>(
  req: FastifyRequest,
  newContext: InContext,
): void {
  const config = req.routeOptions.config;
  config[contextSymbol] = newContext;
}

export function getRuntime(request: FastifyRequest, reply: FastifyReply): RuntimeAdapter {
  return getAdapterRuntime("fastify", {
    params: request.params as Record<string, string> | undefined,
    req: request.raw as IncomingMessage,
    res: reply.raw,
  });
}
