import type {
  Get,
  RuntimeAdapter,
  UniversalFn,
  UniversalHandler,
  UniversalMiddleware,
} from "@universal-middleware/core";
import { bindUniversal, getAdapterRuntime, universalSymbol } from "@universal-middleware/core";
import type { ServerHandler, ServerMiddleware, ServerRequest } from "srvx";

export type SrvxHandler<In extends Universal.Context> = UniversalFn<UniversalHandler<In>, ServerHandler>;
export type SrvxMiddleware<In extends Universal.Context, Out extends Universal.Context> = UniversalFn<
  UniversalMiddleware<In, Out>,
  ServerMiddleware
>;

/**
 * Creates a request handler to be passed to app.all() or any other route function
 */
export function createHandler<T extends unknown[], InContext extends Universal.Context>(
  handlerFactory: Get<T, UniversalHandler<InContext>>,
): Get<T, SrvxHandler<InContext>> {
  return (...args) => {
    const handler = handlerFactory(...args);

    return bindUniversal(handler, async function universalHandlerSrvx(request) {
      const context = initContext<InContext>(request);

      return this[universalSymbol](request, context, getRuntime(request));
    });
  };
}

/**
 * Creates a middleware to be passed to app.use() or any route function
 */
export function createMiddleware<
  T extends unknown[],
  InContext extends Universal.Context,
  OutContext extends Universal.Context,
>(
  middlewareFactory: Get<T, UniversalMiddleware<InContext, OutContext>>,
): Get<T, SrvxMiddleware<InContext, OutContext>> {
  return (...args) => {
    const middleware = middlewareFactory(...args);

    return bindUniversal(middleware, async function universalMiddlewareSrvx(request, next) {
      const context = initContext<InContext>(request);

      const response = await this[universalSymbol](request, context, getRuntime(request));

      if (typeof response === "function") {
        const res = await next();
        return (await response(res)) ?? res;
      } else if (response !== null && typeof response === "object") {
        if (response instanceof Response) {
          return response;
        }
        // Update context
        setContext(request, response);
        return next();
      } else {
        return next();
      }
    });
  };
}

function initContext<Context extends Universal.Context = Universal.Context>(request: ServerRequest): Context {
  let ctx = getContext<Context>(request);
  if (ctx === undefined) {
    ctx = {} as Context;
    setContext(request, ctx);
  }
  return ctx;
}

function setContext<Context extends Universal.Context = Universal.Context>(
  request: ServerRequest,
  value: Context,
): void {
  request.context = value;
}

export function getContext<Context extends Universal.Context = Universal.Context>(request: ServerRequest): Context {
  return request.context as Context;
}

export function getRuntime(request: ServerRequest): RuntimeAdapter {
  return getAdapterRuntime(
    "srvx",
    {
      params: undefined,
      srvx: request,
    },
    {
      env: request.runtime?.cloudflare?.env,
      ctx: {
        waitUntil: request.waitUntil?.bind(request),
        passThroughOnException: request.runtime?.cloudflare?.context.passThroughOnException,
      },
      req: request.runtime?.node?.req,
      res: request.runtime?.node?.res,
    },
  );
}
