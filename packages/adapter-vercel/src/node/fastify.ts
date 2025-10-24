import type { App } from "@universal-middleware/fastify";
import type { VercelNodeHandlerRaw } from "../utils/common.js";

/**
 * Fastify app to Vercel Node request handler
 */
export function createNodeHandler(app: App): VercelNodeHandlerRaw {
  const ready = app.ready();

  return async function fastifyHandlerVercelNode(message, response) {
    await ready;
    app.server.emit("request", message, response);
  };
}
