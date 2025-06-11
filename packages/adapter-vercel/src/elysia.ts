import type { App } from "@universal-middleware/elysia";

/**
 * Elysia app to Vercel Edge request handler
 * @throws {Error} Not implemented yet
 */
export function createEdgeHandler(app: App): never {
  throw new Error("Elysia is not supported on Vercel Edge.");
}

/**
 * Elysia app to Vercel Node request handler
 * @throws {Error} Not implemented yet
 */
export function createNodeHandler(app: App): never {
  throw new Error("Elysia is not supported on Vercel Node.");
}
