import type { App } from "@universal-middleware/express";
import type { ErrorRequestHandler, Express } from "express";
import type { VercelNodeHandlerRaw } from "./common";

/**
 * Express app to Vercel Edge request handler
 * @throws {Error} Incompatible target
 */
export function createEdgeHandler(_app: App): never {
  throw new Error("Express is not supported on Vercel Edge.");
}

const expressErrorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err) {
    if (err instanceof Error) {
      res.status(500).send(err.stack ?? err.message);
    } else {
      res.status(500).send("Internal Server Error");
    }
  }
};

/**
 * Express app to Vercel Node request handler
 */
export function createNodeHandler(app: App, errorHandler = true): VercelNodeHandlerRaw {
  if (errorHandler) {
    (app as Express).use(expressErrorHandler);
  }

  return app;
}
