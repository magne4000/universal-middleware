import type { App } from "@universal-middleware/h3";
import type { WebHandler } from "h3";
import type { VercelEdgeHandlerRaw } from "../utils/common.js";

/**
 * H3 app to Vercel Edge request handler
 */
export function createEdgeHandler(app: App): VercelEdgeHandlerRaw {
  let handler: WebHandler | undefined;

  return async function h3HandlerVercelEdge(request) {
    if (!handler) {
      try {
        const { toWebHandler } = await import("h3");
        handler = toWebHandler(app);
      } catch (e) {
        throw new Error('Failed to load "h3" package. Please ensure it is installed.', { cause: e });
      }
    }
    return handler(request);
  };
}
