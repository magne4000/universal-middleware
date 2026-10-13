import type { App } from "@universal-middleware/h3";
import type { VercelEdgeHandlerRaw } from "../utils/common.js";

/**
 * H3 app to Vercel Edge request handler
 */
export function createEdgeHandler(app: App): VercelEdgeHandlerRaw {
  return async function h3HandlerVercelEdge(request) {
    return app.fetch(request);
  };
}
