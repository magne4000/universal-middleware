import type { App } from "@universal-middleware/fastify";
import type { VercelNodeHandlerRaw } from "./common";

/**
 * Fastify app to Vercel Edge request handler
 * @throws {Error} Incompatible target
 */
export function createEdgeHandler(app: App): never {
  throw new Error("Fastify is not supported on Vercel Edge.");
}

/**
 * Fastify app to Vercel Node request handler
 */
export function createNodeHandler(app: App): VercelNodeHandlerRaw {
  return async function fastifyHandlerVercelNode(message, response) {
    await app.ready();
    app.server.emit("request", message, response);
  };
}
