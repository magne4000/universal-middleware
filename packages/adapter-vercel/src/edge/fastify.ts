import type { App } from "@universal-middleware/fastify";

/**
 * Fastify app to Vercel Edge request handler
 * @throws {Error} Incompatible target
 */
export function createEdgeHandler(_app: App): never {
  throw new Error("Fastify is not supported on Vercel Edge.");
}
