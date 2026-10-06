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
  contextSymbol,
  getAdapterRuntime,
  universalSymbol,
} from "@universal-middleware/core";
import { type Context as ElysiaContext, Elysia, type Handler, NotFoundError } from "elysia";

export const pendingSymbol = Symbol.for("unPending");
export const pendingHandledSymbol = Symbol.for("unPendingHandled");

// biome-ignore lint/suspicious/noExplicitAny: avoid complex elysia types mismatch
export type ElysiaHandler<In extends Universal.Context> = UniversalFn<UniversalHandler<In>, Handler<any, any>>;
export type ElysiaMiddleware<In extends Universal.Context, Out extends Universal.Context> = UniversalFn<
  UniversalMiddleware<In, Out>,
  typeof initPlugin
>;

// Elysia parses the body of the routes that use it before any hook runs, consuming the request
// stream. `captureRequestBody` keeps an unread copy so that universal middlewares and handlers
// still get the exact bytes, whatever Elysia's parsing makes of them.
const unparsedBodies = new WeakMap<Request, Request>();

/** Elysia `onParse` hook: remembers the request body without parsing it, so Elysia's own parsing goes on. */
export function captureRequestBody(request: Request): void {
  if (request.body) unparsedBodies.set(request, request.clone());
}

function requestOf(request: Request) {
  return (unparsedBodies.get(request) ?? request).clone();
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
        requestOf(elysiaContext.request),
        context,
        // biome-ignore lint/suspicious/noExplicitAny: ignored
        getRuntime(elysiaContext as any),
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
                requestOf(elysiaContext.request),
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

          try {
            for (const p of elysiaContext[pendingSymbol]) {
              const res = await p(currentResponse);
              if (res) {
                currentResponse = res;
              }
            }
          } catch (e) {
            console.error(e);
            return e;
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
    elysiaContext.request,
  );
}
