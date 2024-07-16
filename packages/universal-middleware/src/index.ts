import type {
  UniversalHandler,
  UniversalMiddleware,
} from "@universal-middleware/core";
import {
  createHandler as createHonoHandler,
  createMiddleware as createHonoMiddleware,
} from "@universal-middleware/hono";
import {
  createHandler as createExpressHandler,
  createMiddleware as createExpressMiddleware,
} from "@universal-middleware/express";
import {
  createHandler as createHattipHandler,
  createMiddleware as createHattipMiddleware,
} from "@universal-middleware/hattip";

export function universalMiddlewareFactory(middleware: UniversalMiddleware) {
  return {
    get hono() {
      return createHonoMiddleware(middleware);
    },
    get express() {
      return createExpressMiddleware(middleware);
    },
    get hattip() {
      return createHattipMiddleware(middleware);
    },
  };
}

export function universalHandlerFactory(handler: UniversalHandler) {
  return {
    get hono() {
      return createHonoHandler(handler);
    },
    get express() {
      return createExpressHandler(handler);
    },
    get hattip() {
      return createHattipHandler(handler);
    },
  };
}
