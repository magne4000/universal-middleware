import type { App } from "@universal-middleware/h3";
import type { VercelEdgeHandlerRaw, VercelNodeHandlerRaw } from "./common";
import { toNodeListener, toWebHandler } from "h3";

/**
 * H3 app to Vercel Edge request handler
 */
export function createEdgeHandler(app: App): VercelEdgeHandlerRaw {
  const handler = toWebHandler(app);

  return function h3HandlerVercelEdge(request) {
    return handler(request);
  };
}

/**
 * H3 app to Vercel Node request handler
 */
export function createNodeHandler(app: App): VercelNodeHandlerRaw {
  const handler = toNodeListener(app);

  return async function h3HandlerVercelNode(message, response) {
    return handler(message, response);
  };
}
