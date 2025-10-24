import type { App } from "@universal-middleware/elysia";

/**
 * Elysia app to Vercel Edge request handler
 * @throws {Error} Incompatible target
 */
export function createEdgeHandler(_app: App): never {
  throw new Error("Elysia is not supported on Vercel Edge.");
}
