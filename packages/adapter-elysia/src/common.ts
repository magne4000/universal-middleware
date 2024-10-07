import type { Awaitable, Get, RuntimeAdapter, UniversalHandler, UniversalMiddleware } from "@universal-middleware/core";
import { getAdapterRuntime } from "@universal-middleware/core";
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
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      let context = (elysiaContext as any)[contextSymbol];

      if (!context) {
        Object.defineProperty(elysiaContext, contextSymbol, {
          value: {},
        });
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        context = (elysiaContext as any)[contextSymbol];
      }

      return handler(elysiaContext.request, context, getRuntime(elysiaContext));
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
        const response = await middleware(
          elysiaContext.request,
          elysiaContext[contextSymbol],
          getRuntime(elysiaContext),
        );

        if (typeof response === "function") {
          elysiaContext[pendingSymbol].push(response);
        } else if (response !== null && typeof response === "object") {
          if (response instanceof Response) {
            return response;
          }
          // Update context
          Object.defineProperty(elysiaContext, contextSymbol, {
            value: response,
          });
        }
      })
      .onAfterHandle({ as: "global" }, async (elysiaContext) => {
        if (elysiaContext[pendingHandledSymbol]) return;

        Object.defineProperty(elysiaContext, pendingHandledSymbol, {
          value: true,
        });

        for (const p of elysiaContext[pendingSymbol]) {
          const res = await p(elysiaContext.response);
          if (res) {
            return res;
          }
        }
      });
  };
}

function initPlugin<Context extends Universal.Context = Universal.Context>() {
  return new Elysia({ name: "universal-middleware-context" }).resolve({ as: "global" }, () => {
    return {
      [contextSymbol]: {} as Context,
      [pendingSymbol]: [] as ((response: Response) => Awaitable<Response>)[],
      [pendingHandledSymbol]: false as boolean,
    };
  });
}

// function setContext<Context extends Universal.Context = Universal.Context>(
//   elysiaContext: Parameters<ReturnType<typeof initPlugin<Context>>['onBeforeHandle']>[1],
//   value: Context,
// ): void {
//   elysiaContext.store[contextSymbol].set(elysiaContext.request, value);
// }
//
// export function getContext<Context extends Universal.Context = Universal.Context>(
//   elysiaContext: ReturnType<typeof initPlugin<Context>>,
// ): Context {
//   return elysiaContext.store[contextSymbol].set(elysiaContext.request, value);
// }

export function getRuntime(elysiaContext: ElysiaContext): RuntimeAdapter {
  let params: Record<string, string> | undefined = undefined;
  // TODO: cloudflare context
  // const ctx = getExecutionCtx(elysiaContext);

  params = elysiaContext.params;

  // try {
  //   params = elysiaContext.params;
  // } catch {
  //   // Retrieve Cloudflare Pages potential params
  //   if (ctx) {
  //     params = (ctx as { params?: Record<string, string> }).params ?? undefined;
  //   }
  // }
  return getAdapterRuntime(
    "elysia",
    {
      params,
    },
    {
      // env: elysiaContext.env,
      // ctx,
    },
  );
}
