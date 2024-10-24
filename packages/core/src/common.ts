import { getAdapterRuntime } from "./adapter";
import type {
  Get,
  RuntimeAdapter,
  UniversalHandler,
  UniversalHandlerShort,
  UniversalMiddleware,
  UniversalMiddlewareShort,
} from "./types";
import { getRequestContextAndRuntime, initRequestWeb } from "./utils";

export function createGenericHandler<T extends unknown[]>(
  handlerFactory: Get<T, UniversalHandler>,
): Get<T, UniversalHandlerShort> {
  return (...args) => {
    const handler = handlerFactory(...args);

    return async (request) => {
      initRequestWeb(request, request, getRuntime);
      const { context, runtime } = getRequestContextAndRuntime(request);
      return handler(request, context, runtime);
    };
  };
}

export function createGenericMiddleware<
  T extends unknown[],
  InContext extends Universal.Context,
  OutContext extends Universal.Context,
>(middlewareFactory: Get<T, UniversalMiddleware<InContext, OutContext>>): Get<T, UniversalMiddlewareShort<OutContext>> {
  return (...args) => {
    const handler = middlewareFactory(...args);

    return async (request) => {
      initRequestWeb(request, request, getRuntime);
      const { context, runtime } = getRequestContextAndRuntime<InContext>(request);
      return handler(request, context, runtime);
    };
  };
}

function getRuntime(): RuntimeAdapter {
  return getAdapterRuntime(
    "other",
    {
      params: undefined,
    },
    {},
  );
}
