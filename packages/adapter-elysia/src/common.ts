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
  cancelReplacedBody,
  cloneRequest,
  contextSymbol,
  getAdapterRuntime,
  keepBody,
  keptBody,
  universalSymbol,
  withMutableHeaders,
} from "@universal-middleware/core";
import { Elysia, type Context as ElysiaContext, type Handler, NotFoundError } from "elysia";
import { mapResponse as mapResponseBun } from "elysia/adapter/bun/handler";
import { mapResponse as mapResponseWeb } from "elysia/adapter/web-standard/handler";

const pendingSymbol = Symbol.for("unPending");
const pendingHandledSymbol = Symbol.for("unPendingHandled");
// The conversion of Elysia's default adapter, which differs on Bun (e.g. `text/plain;charset=utf-8` for a string)
const mapResponse = typeof Bun === "undefined" ? mapResponseWeb : mapResponseBun;

// biome-ignore lint/suspicious/noExplicitAny: avoid complex elysia types mismatch
export type ElysiaHandler<In extends Universal.Context> = UniversalFn<UniversalHandler<In>, Handler<any, any>>;
export type ElysiaMiddleware<In extends Universal.Context, Out extends Universal.Context> = UniversalFn<
  UniversalMiddleware<In, Out>,
  typeof initPlugin
>;

// Below this a body is copied eagerly: building the stream costs more than copying the bytes.
const eagerLimit = 64 * 1024;

async function requestOf(request: Request) {
  if (request.method === "GET" || request.method === "HEAD") return request.clone();
  const kept = Number(request.headers.get("content-length")) <= eagerLimit ? keptBody(request) : undefined;
  if (kept) {
    return cloneRequest(request, { body: await kept });
  }
  // Costs nothing until the middleware reads the body: it then gets a copy of the kept bytes, or of the stream when
  // nothing read the body yet, so a route that streams it keeps it.
  let copy: ReadableStreamDefaultReader<Uint8Array> | undefined;
  return cloneRequest(request, {
    body: new ReadableStream(
      {
        async pull(controller) {
          copy ??= request.clone().body?.getReader();
          const chunk = await copy?.read();
          // A copy, also of a `Buffer`: on Node 22 and Bun the clone's chunks are the ones the route reads
          if (chunk && !chunk.done) controller.enqueue(new Uint8Array(chunk.value));
          else controller.close();
        },
        cancel: (reason) => void copy?.cancel(reason),
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
        await requestOf(elysiaContext.request),
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
                await requestOf(elysiaContext.request),
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
        // With `aot: true`, Elysia validates the value an afterHandle hook returns against the route's response schema,
        // then runs the next hook: returning the route's value unchanged hands it validated to the response functions.
        // With `aot: false`, the first value a hook returns ends the hooks, and Elysia has no hook after validation.
        // Elysia's compiled handler (`aot: true`) sets `responseValue` before the afterHandle hooks; `aot: false` doesn't.
        .onAfterHandle(async function validateForResponseFunctions(elysiaContext) {
          if (
            "responseValue" in elysiaContext &&
            !elysiaContext[pendingHandledSymbol] &&
            elysiaContext[pendingSymbol].length > 0 &&
            !(elysiaContext.response instanceof Response)
          ) {
            return elysiaContext.response;
          }
          return runResponseFunctions(elysiaContext);
        })
        .onAfterHandle(runResponseFunctions)
        // biome-ignore lint/suspicious/noExplicitAny: avoid recursive type error
        .as("scoped") as any,
    );
  };
}

interface ResponseFunctionsContext {
  response: unknown;
  set: ElysiaContext["set"];
  [pendingSymbol]: ((response: Response) => Awaitable<Response | undefined>)[];
  [pendingHandledSymbol]: boolean;
}

/** Runs the pending response functions on what Elysia would send for the route's value, once per request */
async function runResponseFunctions(elysiaContext: ResponseFunctionsContext): Promise<unknown> {
  if (elysiaContext[pendingHandledSymbol]) return;

  Object.defineProperty(elysiaContext, pendingHandledSymbol, {
    value: true,
  });

  const value = elysiaContext.response;
  if (elysiaContext[pendingSymbol].length === 0) {
    // With `aot: false`, Elysia only validates the route's value if an afterHandle hook returns it
    return "responseValue" in elysiaContext ? undefined : value;
  }

  // What Elysia would send for the route's value, with the status and headers of `set`. Not with the cookies of
  // `set.cookie`: Elysia adds them to the Response it sends (signed, with `aot: true`), and would add them twice.
  const { set } = elysiaContext;
  let currentResponse = await mapResponse(value, { status: set.status, headers: { ...set.headers } });

  try {
    for (const p of elysiaContext[pendingSymbol]) {
      currentResponse = withMutableHeaders(currentResponse);
      const res = await p(currentResponse);
      if (res) {
        cancelReplacedBody(currentResponse, res);
        currentResponse = res;
      }
    }
  } catch (e) {
    console.error(e);
    return e;
  }

  // Elysia streams a chunked Response again, and loses its cookies: off Bun it keeps only the headers `set` has, on Bun
  // the cookies of `set.cookie` replace them. Without `transfer-encoding`, it sends the Response as is.
  // TODO: drop once Elysia keeps the headers of a chunked Response (https://github.com/elysiajs/elysia/issues/2018)
  if (currentResponse.headers.has("transfer-encoding")) {
    currentResponse = new Response(currentResponse.body, currentResponse);
    currentResponse.headers.delete("transfer-encoding");
  }

  // Elysia merges `set` into the Response it sends: the headers the Response lacks, and the status if it is 200.
  // The response functions got them already and may have changed them: `set` now describes the Response.
  set.status = currentResponse.status;
  set.headers = Object.fromEntries([...currentResponse.headers].filter(([name]) => name !== "set-cookie"));
  return currentResponse;
}

// Elysia parses the body of the routes that need it before any hook but `onRequest` runs, consuming the request stream
function initPlugin<Context extends Universal.Context = Universal.Context>() {
  return new Elysia({ name: "universal-middleware-context" })
    .onRequest(({ request }) => keepBody(request))
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
