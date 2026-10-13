import type { App } from "@universal-middleware/h3";
import type { NodeHandler } from "h3";
import type { VercelNodeHandlerRaw } from "../utils/common.js";

/**
 * H3 app to Vercel Node request handler
 */
export function createNodeHandler(app: App): VercelNodeHandlerRaw {
  let handler: NodeHandler | undefined;

  return async function h3HandlerVercelNode(message, response) {
    if (!handler) {
      try {
        // h3 is an optional peer dependency: `@universal-middleware/vercel/node` also serves apps without it
        const { toNodeHandler } = await import("h3");
        handler = toNodeHandler(app);
      } catch (e) {
        throw new Error('Failed to load "h3" package. Please ensure it is installed.', { cause: e });
      }
    }
    await handler(message, response);
  };
}
