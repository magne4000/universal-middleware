import type { App } from "@universal-middleware/hono";
import type { VercelEdgeHandlerRaw } from "../utils/common.js";

/**
 * Hono app to Vercel Edge request handler
 */
export function createEdgeHandler(app: App): VercelEdgeHandlerRaw {
  return function honoHandlerVercelEdge(request) {
    return app.fetch(request);
  };
}
