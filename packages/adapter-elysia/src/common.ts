import type { Awaitable, Get, RuntimeAdapter, UniversalHandler, UniversalMiddleware } from "@universal-middleware/core";
import {
  getAdapterRuntime,
  getRequestContextAndRuntime,
  initRequestWeb,
  setRequestContext,
} from "@universal-middleware/core";
import { Elysia, type Context as ElysiaContext, type Handler } from "elysia";

export const contextSymbol = Symbol("unContext");
export const pendingSymbol = Symbol("unPending");
export const pendingHandledSymbol = Symbol("unPendingHandled");

export type ElysiaHandler = Handler;
export type ElysiaMiddleware = ReturnType<typeof createMiddleware>;

/**
 * Creates a request handler to be passed to app.all() or any other route function
 */
export function createHandler<T extends unknown[]>(handlerFactory: Get<T, UniversalHandler>) {
  return (...args: T) => {
    const handler = handlerFactory(...args);

    return ((elysiaContext) => {
      initRequestWeb(elysiaContext.request, elysiaContext, () => getRuntime(elysiaContext));
      const { context, runtime } = getRequestContextAndRuntime(elysiaContext.request);

      return handler(elysiaContext.request, context, runtime);
    }) satisfies ElysiaHandler;
  };
}

/**
 * Creates a middleware to be passed to app.use() or any route function
 */
export function createMiddleware<
  T extends unknown[],
  InContext extends Universal.Context,
  OutContext extends Universal.Context,
>(middlewareFactory: Get<T, UniversalMiddleware<InContext, OutContext>>) {
  return (...args: T) => {
    const middleware = middlewareFactory(...args);

    return new Elysia()
      .use(initPlugin<InContext>())
      .onBeforeHandle({ as: "global" }, async (elysiaContext) => {
        initRequestWeb(elysiaContext.request, elysiaContext, () => getRuntime(elysiaContext));
        const { context, runtime } = getRequestContextAndRuntime<InContext>(elysiaContext.request);
        const response = await middleware(elysiaContext.request, context, runtime);

        if (typeof response === "function") {
          elysiaContext[pendingSymbol].push(response);
        } else if (response !== null && typeof response === "object") {
          if (response instanceof Response) {
            return response;
          }
          // Update context
          // elysiaContext.setContext(response);
          setRequestContext(elysiaContext.request, response);
        }
      })
      .onAfterHandle({ as: "global" }, async (elysiaContext) => {
        if (elysiaContext[pendingHandledSymbol]) return;

        Object.defineProperty(elysiaContext, pendingHandledSymbol, {
          value: true,
        });

        let currentResponse: Response = elysiaContext.response;

        for (const p of elysiaContext[pendingSymbol]) {
          const res = await p(currentResponse);
          if (res) {
            currentResponse = res;
          }
        }

        return currentResponse;
      });
  };
}

function initPlugin<Context extends Universal.Context = Universal.Context>() {
  return new Elysia({ name: "universal-middleware-context" })
    .derive({ as: "global" }, () => {
      return {
        [contextSymbol]: {} as Context,
        [pendingSymbol]: [] as ((response: Response) => Awaitable<Response>)[],
        [pendingHandledSymbol]: false as boolean,
      };
    })
    .derive({ as: "global" }, (elysiaContext) => {
      return {
        getContext() {
          return elysiaContext[contextSymbol];
        },
        setContext<NewContext extends Universal.Context = Universal.Context>(value: NewContext) {
          Object.defineProperty(elysiaContext, contextSymbol, {
            value,
          });
        },
      };
    });
}

export function getRuntime(elysiaContext: ElysiaContext): RuntimeAdapter {
  let params: Record<string, string> | undefined = elysiaContext.params;
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  const elysiaContextAny = elysiaContext as any;

  const cloudflareContext =
    elysiaContextAny.env && elysiaContextAny.ctx
      ? {
          env: elysiaContextAny.env,
          ctx: elysiaContextAny.ctx,
        }
      : {};

  if (cloudflareContext.ctx) {
    params = (cloudflareContext.ctx as { params?: Record<string, string> }).params ?? params;
  }

  return getAdapterRuntime(
    "elysia",
    {
      params,
    },
    cloudflareContext,
  );
}
