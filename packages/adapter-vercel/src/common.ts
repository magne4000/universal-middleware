import type { IncomingMessage, ServerResponse } from "node:http";
import type { Get, RuntimeAdapter, UniversalFn, UniversalHandler } from "@universal-middleware/core";
import { bindUniversal, getAdapterRuntime, universalSymbol } from "@universal-middleware/core";
import { createRequestAdapter, sendResponse } from "@universal-middleware/express";

export type VercelEdgeHandler<In extends Universal.Context> = UniversalFn<
  UniversalHandler<In>,
  (request: Request) => Response | Promise<Response>
>;
export type VercelNodeHandler<In extends Universal.Context> = UniversalFn<
  UniversalHandler<In>,
  (request: IncomingMessage, response: ServerResponse) => void | Promise<void>
>;

/**
 * Creates an Edge request handler
 */
export function createEdgeHandler<T extends unknown[], InContext extends Universal.Context>(
  handlerFactory: Get<T, UniversalHandler<InContext>>,
): Get<T, VercelEdgeHandler<InContext>> {
  return (...args) => {
    const handler = handlerFactory(...args);

    return bindUniversal(handler, function universalHandlerVercelEdge(request) {
      return this[universalSymbol](request, {} as InContext, getRuntime(request));
    });
  };
}

/**
 * Creates a Node request handler
 */
export function createNodeHandler<T extends unknown[], InContext extends Universal.Context>(
  handlerFactory: Get<T, UniversalHandler<InContext>>,
): Get<T, VercelNodeHandler<InContext>> {
  const requestAdapter = createRequestAdapter();

  return (...args) => {
    const handler = handlerFactory(...args);

    return bindUniversal(handler, async function universalHandlerVercelNode(message, response) {
      const request = requestAdapter(message);
      const res = await this[universalSymbol](request, {} as InContext, getRuntime(message, response));
      return sendResponse(res, response);
    });
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
    request instanceof Request ? "vercel-edge" : "vercel-node",
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
