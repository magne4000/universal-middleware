import type {
  Awaitable,
  Get,
  RuntimeAdapter,
  UniversalFn,
  UniversalHandler,
  UniversalMiddleware,
} from "@universal-middleware/core";
import {
  attachUniversal,
  bindUniversal,
  cloneRequest,
  contextSymbol,
  getAdapterRuntime,
  isBodyInit,
  universalSymbol,
} from "@universal-middleware/core";
import { Elysia, type Context as ElysiaContext, type Handler, NotFoundError } from "elysia";

export const pendingSymbol = Symbol.for("unPending");
export const pendingHandledSymbol = Symbol.for("unPendingHandled");

export type ElysiaHandler<In extends Universal.Context> = UniversalFn<UniversalHandler<In>, Handler>;
export type ElysiaMiddleware<In extends Universal.Context, Out extends Universal.Context> = UniversalFn<
  UniversalMiddleware<In, Out>,
  typeof initPlugin
>;

function cloneRequestWithBody(request: Request, body: unknown) {
  let bodyInit: BodyInit | undefined;
  if (isBodyInit(body)) {
    bodyInit = body;
  } else if (typeof body === "object" && body !== null) {
    bodyInit = JSON.stringify(body);
  }
  return cloneRequest(request, { body: bodyInit });
}

/**
 * Creates a request handler to be passed to app.all() or any other route function
 */
export function createHandler<T extends unknown[], InContext extends Universal.Context>(
  handlerFactory: Get<T, UniversalHandler<InContext>>,
): Get<T, ElysiaHandler<InContext>> {
  return (...args: T) => {
    const handler = handlerFactory(...args);

    return bindUniversal(handler, async function universalHandlerElysia(elysiaContext) {
      // biome-ignore lint/suspicious/noExplicitAny: ignored
      let context = (elysiaContext as any)[contextSymbol];

      if (!context) {
        Object.defineProperty(elysiaContext, contextSymbol, {
          value: {},
        });
        // biome-ignore lint/suspicious/noExplicitAny: ignored
        context = (elysiaContext as any)[contextSymbol];
      }

      const response: Response | undefined = await this[universalSymbol](
        cloneRequestWithBody(elysiaContext.request, elysiaContext.body),
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
        .onBeforeHandle((elysiaContext1) => {
          return bindUniversal(
            middleware,
            async function universalMiddlewareElysia(elysiaContext: typeof elysiaContext1) {
              const response = await this[universalSymbol](
                cloneRequestWithBody(elysiaContext.request, elysiaContext.body),
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
            },
          )(elysiaContext1);
        })
        .onAfterHandle(async (elysiaContext) => {
          if (elysiaContext[pendingHandledSymbol]) return;

          Object.defineProperty(elysiaContext, pendingHandledSymbol, {
            value: true,
          });

          let currentResponse = elysiaContext.response as Response;

          for (const p of elysiaContext[pendingSymbol]) {
            const res = await p(currentResponse);
            if (res) {
              currentResponse = res;
            }
          }

          return currentResponse;
        })
        // biome-ignore lint/suspicious/noExplicitAny: avoid recursive type error
        .as("scoped") as any,
    );
  };
}

function initPlugin<Context extends Universal.Context = Universal.Context>() {
  return new Elysia({ name: "universal-middleware-context" })
    .derive(() => {
      return {
        [contextSymbol]: {} as Context,
        [pendingSymbol]: [] as ((response: Response) => Awaitable<Response | undefined>)[],
        [pendingHandledSymbol]: false as boolean,
      };
    })
    .derive((elysiaContext) => {
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
    })
    .as("scoped");
}

export function getRuntime(elysiaContext: ElysiaContext): RuntimeAdapter {
  let params: Record<string, string> | undefined = elysiaContext.params;
  // biome-ignore lint/suspicious/noExplicitAny: ignored
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
