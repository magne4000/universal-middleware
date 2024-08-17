import type { IncomingMessage, ServerResponse } from "node:http";
import type { Socket } from "node:net";
import {
  createRequestAdapter,
  type NodeRequestAdapterOptions,
} from "./request.js";
import { sendResponse, wrapResponse } from "./response.js";
import type {
  Awaitable,
  Get,
  UniversalHandler,
  UniversalMiddleware,
} from "@universal-middleware/core";

export const contextSymbol = Symbol("unContext");
export const requestSymbol = Symbol("unRequest");
export const pendingMiddlewaresSymbol = Symbol("unPendingMiddlewares");
export const wrappedResponseSymbol = Symbol("unWrappedResponse");

export const env: Record<string, string | undefined> =
  typeof globalThis.process?.env !== "undefined"
    ? globalThis.process.env
    : typeof (
          import.meta as unknown as Record<
            "env",
            Record<string, string | undefined>
          >
        )?.env !== "undefined"
      ? (
          import.meta as unknown as Record<
            "env",
            Record<string, string | undefined>
          >
        ).env
      : {};

export interface PossiblyEncryptedSocket extends Socket {
  encrypted?: boolean;
}

/**
 * `IncomingMessage` possibly augmented by Express-specific
 * `ip` and `protocol` properties.
 */
export interface DecoratedRequest<
  C extends Universal.Context = Universal.Context,
> extends Omit<IncomingMessage, "socket"> {
  ip?: string;
  protocol?: string;
  socket?: PossiblyEncryptedSocket;
  rawBody?: Buffer | null;
  [contextSymbol]?: C;
  [requestSymbol]?: Request;
}

export interface DecoratedServerResponse extends ServerResponse {
  [pendingMiddlewaresSymbol]?: ((response: Response) => Awaitable<Response>)[];
  [wrappedResponseSymbol]?: boolean;
}

/** Connect/Express style request listener/middleware */
export type NodeMiddleware<C extends Universal.Context = Universal.Context> = (
  req: DecoratedRequest<C>,
  res: DecoratedServerResponse,
  next?: (err?: unknown) => void,
) => void;

export type NodeHandler<C extends Universal.Context = Universal.Context> =
  NodeMiddleware<C>;

/** Adapter options */
export interface NodeAdapterHandlerOptions extends NodeRequestAdapterOptions {}
export interface NodeAdapterMiddlewareOptions
  extends NodeRequestAdapterOptions {}

/**
 * Creates a request handler to be passed to http.createServer() or used as a
 * middleware in Connect-style frameworks like Express.
 */
export function createHandler<T extends unknown[]>(
  handlerFactory: Get<T, UniversalHandler>,
  options: NodeAdapterHandlerOptions = {},
): Get<T, NodeMiddleware> {
  const requestAdapter = createRequestAdapter(options);

  return (...args) => {
    const handler = handlerFactory(...args);

    return async (req, res, next) => {
      try {
        req[contextSymbol] ??= {};
        const request = requestAdapter(req);
        const response = await handler(request, req[contextSymbol]);

        await sendResponse(response, res);
      } catch (error) {
        if (next) {
          next(error);
        } else {
          console.error(error);

          if (!res.headersSent) {
            res.statusCode = 500;
          }

          if (!res.writableEnded) {
            res.end();
          }
        }
      }
    };
  };
}

/**
 * Creates a middleware to be passed to Connect-style frameworks like Express
 */
export function createMiddleware<
  T extends unknown[],
  InContext extends Universal.Context,
  OutContext extends Universal.Context,
>(
  middlewareFactory: Get<T, UniversalMiddleware<InContext, OutContext>>,
  options: NodeAdapterMiddlewareOptions = {},
): Get<T, NodeMiddleware<OutContext>> {
  const requestAdapter = createRequestAdapter(options);

  return (...args) => {
    const middleware = middlewareFactory(...args);

    return async (req, res, next) => {
      try {
        req[contextSymbol] ??= {} as OutContext;
        const request = requestAdapter(req);
        const response = await middleware(request, getContext(req)!);

        if (!response) {
          return next?.();
        } else if (typeof response === "function") {
          if (res.headersSent) {
            throw new Error(
              "Universal Middleware called after headers have been sent. Please open an issue at https://github.com/magne4000/universal-handler",
            );
          }
          wrapResponse(res);
          res[pendingMiddlewaresSymbol] ??= [];
          // `wrapResponse` takes care of calling those middlewares right before sending the response
          res[pendingMiddlewaresSymbol].push(response);
          return next?.();
        } else if (response instanceof Response) {
          await sendResponse(response, res);
        } else {
          req[contextSymbol] = response;
        }
      } catch (error) {
        if (next) {
          next(error);
        } else {
          console.error(error);

          if (!res.headersSent) {
            res.statusCode = 500;
          }

          if (!res.writableEnded) {
            res.end();
          }
        }
      }
    };
  };
}

export function getContext<
  InContext extends Universal.Context = Universal.Context,
>(req: DecoratedRequest): InContext | undefined {
  return req[contextSymbol] as InContext | undefined;
}
