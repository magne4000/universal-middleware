import type { IncomingMessage, ServerResponse } from "node:http";
import type { Get, RuntimeAdapter, UniversalHandler } from "@universal-middleware/core";
import { getAdapterRuntime } from "@universal-middleware/core";
import { createRequestAdapter, sendResponse } from "@universal-middleware/express";

export type VercelEdgeHandler = (request: Request) => Response | Promise<Response>;
export type VercelNodeHandler = (request: IncomingMessage, response: ServerResponse) => void | Promise<void>;

/**
 * Creates an Edge request handler
 */
export function createEdgeHandler<T extends unknown[]>(
  handlerFactory: Get<T, UniversalHandler>,
): Get<T, VercelEdgeHandler> {
  return (...args) => {
    const handler = handlerFactory(...args);

    return (request) => {
      return handler(request, {}, getRuntime(request));
    };
  };
}

/**
 * Creates a Node request handler
 */
export function createNodeHandler<T extends unknown[]>(
  handlerFactory: Get<T, UniversalHandler>,
): Get<T, VercelNodeHandler> {
  const requestAdapter = createRequestAdapter();

  return (...args) => {
    const handler = handlerFactory(...args);

    return async (message, response) => {
      const request = requestAdapter(message);
      const res = await handler(request, {}, getRuntime(message, response));
      return sendResponse(res, response);
    };
  };
}

export function getRuntime(request: Request): RuntimeAdapter;
export function getRuntime(request: IncomingMessage, response: ServerResponse): RuntimeAdapter;
export function getRuntime(request: Request | IncomingMessage, response?: ServerResponse): RuntimeAdapter {
  const routeMatches: string | null | undefined =
    request.headers instanceof Headers
      ? request.headers.get("x-now-route-matches")
      : (request.headers["x-now-route-matches"] as string | undefined);

  return getAdapterRuntime(
    "hono",
    {
      params: Object.fromEntries(
        new URLSearchParams(routeMatches ?? new URL(request.url ?? "", "http://localhost").search).entries(),
      ),
    },
    response
      ? {
          req: request,
          res: response,
        }
      : {},
  );
}
