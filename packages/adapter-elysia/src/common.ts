import type {
  Awaitable,
  Get,
  RuntimeAdapter,
  UniversalFn,
  UniversalHandler,
  UniversalMiddleware,
} from "@universal-middleware/core";
import { attachUniversal, bindUniversal, getAdapterRuntime, universalSymbol } from "@universal-middleware/core";
import { type Context as ElysiaContext, Elysia, type Handler, NotFoundError } from "elysia";

export const contextSymbol = Symbol.for("unContext");
export const pendingSymbol = Symbol.for("unPending");
export const pendingHandledSymbol = Symbol.for("unPendingHandled");

export type ElysiaHandler<In extends Universal.Context> = UniversalFn<UniversalHandler<In>, Handler>;
export type ElysiaMiddleware<In extends Universal.Context, Out extends Universal.Context> = UniversalFn<
  UniversalMiddleware<In, Out>,
  typeof initPlugin
>;

/**
 * Creates a request handler to be passed to app.all() or any other route function
 */
export function createHandler<T extends unknown[], InContext extends Universal.Context>(
  handlerFactory: Get<T, UniversalHandler<InContext>>,
): Get<T, ElysiaHandler<InContext>> {
  return (...args: T) => {
    const handler = handlerFactory(...args);

    return bindUniversal(handler, async function universalHandlerElysia(elysiaContext) {
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      let context = (elysiaContext as any)[contextSymbol];

      if (!context) {
        Object.defineProperty(elysiaContext, contextSymbol, {
          value: {},
        });
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        context = (elysiaContext as any)[contextSymbol];
      }

      const response: Response | undefined = await this[universalSymbol](
        elysiaContext.request,
        context,
        getRuntime(elysiaContext),
      );

      if (response) {
        return response;
      }
      throw new NotFoundError();
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
>(middlewareFactory: Get<T, UniversalMiddleware<InContext, OutContext>>) {
  return (...args: T): ReturnType<typeof initPlugin> => {
    const middleware = middlewareFactory(...args);

    return attachUniversal(
      middleware,
      new Elysia()
        .use(initPlugin<InContext>())
        .onBeforeHandle(
          { as: "global" },
          bindUniversal(middleware, async function universalMiddlewareElysia(elysiaContext) {
            const response = await this[universalSymbol](
              elysiaContext.request,
              elysiaContext.getContext(),
              getRuntime(elysiaContext),
            );
            if (typeof response === "function") {
              elysiaContext[pendingSymbol].push(response);
            } else if (response !== null && typeof response === "object") {
              if (response instanceof Response) {
                return response;
              }
              // Update context
              elysiaContext.setContext(response);
            }
          }),
        )
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
          // biome-ignore lint/suspicious/noExplicitAny: avoid recursive type error
        }) as any,
    );
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
      elysia: elysiaContext,
    },
    cloudflareContext,
  );
}
