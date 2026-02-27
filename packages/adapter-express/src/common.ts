import type { ServerResponse } from "node:http";
import type { Get, RuntimeAdapter, UniversalHandler, UniversalMiddleware } from "@universal-middleware/core";
import { bindUniversal, contextSymbol, getAdapterRuntime, universalSymbol } from "@universal-middleware/core";
import { pendingMiddlewaresSymbol } from "./const.js";
import { createRequestAdapter } from "./request.js";
import { sendResponse, wrapResponse } from "./response.js";
import type {
  DecoratedRequest,
  DecoratedServerResponse,
  NodeAdapterHandlerOptions,
  NodeAdapterMiddlewareOptions,
  NodeHandler,
  NodeMiddleware,
} from "./types.js";

function nextOr404(res: ServerResponse, next?: () => unknown) {
  if (next) {
    next();
  } else {
    res.statusCode = 404;
    res.end();
  }
}

/**
 * Creates a request handler to be passed to http.createServer() or used as a
 * middleware in Connect-style frameworks like Express.
 */
export function createHandler<T extends unknown[], InContext extends Universal.Context>(
  handlerFactory: Get<T, UniversalHandler<InContext>>,
  options: NodeAdapterHandlerOptions = {},
): Get<T, NodeHandler<InContext>> {
  const requestAdapter = createRequestAdapter(options);

  return (...args) => {
    const handler = handlerFactory(...args);

    return bindUniversal(handler, async function universalHandlerExpress(req, res, next) {
      try {
        req[contextSymbol] ??= {} as InContext;
        const request = requestAdapter(req);
        const response: Response | undefined = await this[universalSymbol](
          request,
          req[contextSymbol],
          getRuntime(req, res),
        );

        if (!response) {
          nextOr404(res, next);
        } else {
          await sendResponse(response, res);
        }
      } catch (error) {
        if (next) {
          next(error);
        } else {
          console.error(error);

          if (!res.headersSent) {
            res.statusCode = 500;
          }

          if (!res.writableEnded) {
            res.end();
          }
        }
      }
    });
  };
}

/**
 * Creates a middleware to be passed to Connect-style frameworks like Express
 */
export function createMiddleware<
  T extends unknown[],
  InContext extends Universal.Context,
  OutContext extends Universal.Context,
>(
  middlewareFactory: Get<T, UniversalMiddleware<InContext, OutContext>>,
  options: NodeAdapterMiddlewareOptions = {},
): Get<T, NodeMiddleware<InContext, OutContext>> {
  const requestAdapter = createRequestAdapter(options);

  return (...args) => {
    const middleware = middlewareFactory(...args);

    return bindUniversal(middleware, async function universalMiddlewareExpress(req, res, next) {
      try {
        req[contextSymbol] ??= {} as InContext;
        const request = requestAdapter(req);
        const response = await this[universalSymbol](request, getContext(req), getRuntime(req, res));

        if (!response) {
          return nextOr404(res, next);
        }
        if (typeof response === "function") {
          if (res.headersSent) {
            throw new Error(
              "Universal Middleware called after headers have been sent. Please open an issue at https://github.com/magne4000/universal-middleware",
            );
          }
          // Deno fix
          // biome-ignore lint/suspicious/noExplicitAny: ignored
          if (req.complete === undefined) req.complete = (req as any)._readableState?.ended ?? true;
          wrapResponse(res, next);
          res[pendingMiddlewaresSymbol] ??= [];
          // `wrapResponse` takes care of calling those middlewares right before sending the response
          res[pendingMiddlewaresSymbol].push(response);
          return nextOr404(res, next);
        }
        if (response instanceof Response) {
          await sendResponse(response, res);
        } else {
          req[contextSymbol] = response as unknown as InContext;
          return nextOr404(res, next);
        }
      } catch (error) {
        if (next) {
          next(error);
        } else {
          console.error(error);

          if (!res.headersSent) {
            res.statusCode = 500;
          }

          if (!res.writableEnded) {
            res.end();
          }
        }
      }
    });
  };
}

export function getContext<InContext extends Universal.Context = Universal.Context>(req: DecoratedRequest): InContext {
  return req[contextSymbol] as InContext;
}

export function getRuntime(request: DecoratedRequest, response: DecoratedServerResponse): RuntimeAdapter {
  return getAdapterRuntime("express", {
    params: request.params,
    // biome-ignore lint/suspicious/noExplicitAny: cast
    req: request as any,
    // biome-ignore lint/suspicious/noExplicitAny: cast
    res: response as any,
    express: Object.freeze({
      // biome-ignore lint/suspicious/noExplicitAny: cast
      req: request as any,
      // biome-ignore lint/suspicious/noExplicitAny: cast
      res: response as any,
    }),
  });
}
