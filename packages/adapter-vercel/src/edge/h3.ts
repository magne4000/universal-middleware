import type { App } from "@universal-middleware/h3";
import { toWebHandler } from "h3";
import type { VercelEdgeHandlerRaw } from "../utils/common.js";

/**
 * H3 app to Vercel Edge request handler
 */
export function createEdgeHandler(app: App): VercelEdgeHandlerRaw {
  const handler = toWebHandler(app);

  return function h3HandlerVercelEdge(request) {
    return handler(request);
  };
}
