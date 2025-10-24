import type { App } from "@universal-middleware/express";

/**
 * Express app to Vercel Edge request handler
 * @throws {Error} Incompatible target
 */
export function createEdgeHandler(_app: App): never {
  throw new Error("Express is not supported on Vercel Edge.");
}
