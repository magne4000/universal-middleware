import type { App } from "@universal-middleware/hattip";
import type { VercelEdgeHandlerRaw } from "../utils/common.js";
import { createContext } from "../utils/hattip.js";

/**
 * Hattip app to Vercel Edge request handler
 */
export function createEdgeHandler(app: App): VercelEdgeHandlerRaw {
  const handler = app.buildHandler();

  return function hattipHandlerVercelEdge(request) {
    return handler(createContext(request, "vercel-edge"));
  };
}
