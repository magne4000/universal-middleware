import type { IncomingMessage } from "node:http";
import type {
  Get,
  UniversalHandler,
  UniversalMiddleware,
} from "@universal-middleware/core";
import { getAdapterRuntime } from "@universal-middleware/core";
import { createRequestAdapter } from "@universal-middleware/express";
import type {
  FastifyPluginAsync,
  FastifyReply,
  FastifyRequest,
  RouteHandlerMethod,
} from "fastify";
import fp from "fastify-plugin";

export const contextSymbol = Symbol("unContext");
export const pendingMiddlewaresSymbol = Symbol("unPendingMiddlewares");
export const wrappedResponseSymbol = Symbol("unWrappedResponse");

export type FastifyMiddleware = FastifyPluginAsync;
export type FastifyHandler = RouteHandlerMethod;

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

function isBodyInit(value: unknown): value is BodyInit {
  return (
    value === null ||
    typeof value === "string" ||
    value instanceof Blob ||
    value instanceof ArrayBuffer ||
    ArrayBuffer.isView(value) ||
    value instanceof FormData ||
    value instanceof URLSearchParams ||
    value instanceof ReadableStream
  );
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

  Object.entries(headers).forEach(([key, value]) => {
    if (key === "set-cookie") return;
    if (typeof value === "string") {
      ret.set(key, value);
    } else if (typeof value === "number") {
      ret.set(key, String(value));
    } else if (Array.isArray(value)) {
      if (value.length === 1) {
        ret.set(key, value[0]);
      } else if (value.length > 1) {
        console.warn(
          `Header "${key}" should not be an array. Only last value will be sent`,
        );
        ret.set(key, value.at(-1)!);
      }
    }
  });

  return ret;
}

export function createHandler<
  T extends unknown[],
  InContext extends Universal.Context,
>(handlerFactory: Get<T, UniversalHandler>): Get<T, FastifyHandler> {
  const requestAdapter = createRequestAdapter();

  return (...args) => {
    const handler = handlerFactory(...args);

    return async function (request, reply) {
      const ctx = initContext<InContext>(request);
      const response = await handler(
        requestAdapter(request.raw),
        ctx,
        getAdapterRuntime("node", {
          req: request.raw as IncomingMessage,
          res: reply.raw,
        }),
      );

      if (response) {
        if (!response.body) {
          patchBody(response);
        }

        return reply.send(response);
      }
    };
  };
}

export function createMiddleware<
  T extends unknown[],
  InContext extends Universal.Context,
  OutContext extends Universal.Context,
>(
  middlewareFactory: Get<T, UniversalMiddleware<InContext, OutContext>>,
): Get<T, FastifyMiddleware> {
  const requestAdapter = createRequestAdapter();

  return (...args) => {
    const middleware = middlewareFactory(...args);

    return fp(async (instance) => {
      // Disable pre-parsing body
      // TODO can this be avoided?
      instance.removeAllContentTypeParsers();
      instance.addContentTypeParser("*", function (_request, _payload, done) {
        done(null, "");
      });

      instance.addHook("onRequest", async (request, reply) => {
        const ctx = initContext<InContext>(request);
        const response = await middleware(
          requestAdapter(request.raw),
          ctx,
          getAdapterRuntime("node", {
            req: request.raw as IncomingMessage,
            res: reply.raw,
          }),
        );

        if (!response) {
          return;
        } else if (typeof response === "function") {
          if (reply.sent) {
            throw new Error(
              "Universal Middleware called after headers have been sent. Please open an issue at https://github.com/magne4000/universal-handler",
            );
          }
          request[pendingMiddlewaresSymbol] ??= [];
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
      });

      instance.addHook("onSend", async (request, reply, payload) => {
        if (request[wrappedResponseSymbol]) return payload;
        request[wrappedResponseSymbol] = true;

        if (payload instanceof Response) {
          // good
        } else if (isBodyInit(payload)) {
          payload = new Response(payload, {
            headers: new Headers(getHeaders(reply)),
            status: reply.statusCode,
          });
        } else {
          throw new TypeError(
            "Payload is not a Response or BodyInit compatible",
          );
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
    });
  };
}

function initContext<InContext extends Universal.Context = Universal.Context>(
  req: FastifyRequest,
): InContext {
  const config = req.routeOptions.config;
  config[contextSymbol] ??= {};
  return config[contextSymbol] as InContext;
}

export function getContext<
  InContext extends Universal.Context = Universal.Context,
>(req: FastifyRequest): InContext | undefined {
  const config = req.routeOptions.config;
  return config[contextSymbol] as InContext;
}

export function setContext<
  InContext extends Universal.Context = Universal.Context,
>(req: FastifyRequest, newContext: InContext): void {
  const config = req.routeOptions.config;
  config[contextSymbol] = newContext;
}
