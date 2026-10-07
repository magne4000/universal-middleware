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

// Elysia parses the body of the routes that need it before any hook runs, consuming the request
// stream. The plugin's `onRequest` hook (it runs before any `onParse`) arranges for an unread copy to
// be taken right before the first read, so that universal middlewares and handlers still get the exact
// bytes, whatever Elysia's parsing makes of them. Requests nobody reads, such as the ones of a route
// that streams `request.body` itself, are never copied.
const unparsedBodies = new WeakMap<Request, Request>();
const bodyReaders = ["text", "json", "arrayBuffer", "formData", "blob", "bytes"] as const;

function keepUnparsedBody(request: Request) {
  for (const name of bodyReaders) {
    const read = request[name]?.bind(request);
    if (!read) continue;
    Object.defineProperty(request, name, {
      value: () => {
        if (!unparsedBodies.has(request)) unparsedBodies.set(request, request.clone());
        return read();
      },
    });
  }
}

function requestOf(request: Request) {
  const unparsed = unparsedBodies.get(request);
  if (unparsed) return unparsed.clone();
  if (request.method === "GET" || request.method === "HEAD") return request.clone();
  // Nothing read the body yet: copy it only if the middleware does, so a route that streams it keeps it.
  let copy: ReadableStreamDefaultReader<Uint8Array> | undefined;
  return cloneRequest(request, {
    body: new ReadableStream(
      {
        async pull(controller) {
          copy ??= request.clone().body?.getReader();
          const chunk = await copy?.read();
          if (chunk && !chunk.done) controller.enqueue(chunk.value);
          else controller.close();
        },
        cancel: (reason) => copy?.cancel(reason),
      },
      { highWaterMark: 0 },
    ),
  });
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
    .onRequest(({ request }) => keepUnparsedBody(request))
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
