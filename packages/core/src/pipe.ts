import { nextRequestSymbol, universalSymbol } from "./const";
import type {
  AnyFn,
  Awaitable,
  EnhancedMiddleware,
  RuntimeAdapter,
  UniversalFn,
  UniversalHandler,
  UniversalMiddleware,
} from "./types";
import { bindUniversal, cancelReplacedBody, getUniversal, isHandler, ordered } from "./utils";

type _Out<T> = T extends UniversalMiddleware<any, infer C> ? C : never;
type Out<T> = T extends UniversalFn<infer X, infer _> ? _Out<X> : _Out<T>;
type _In<T> = T extends UniversalHandler<infer C> ? C : T extends UniversalMiddleware<infer C, any> ? C : never;
type In<T> = T extends UniversalFn<infer X, infer _> ? _In<X> : _In<T>;
type First<T extends any[]> = T extends [infer X, ...any[]] ? X : never;
type Last<T extends any[]> = T extends [...any[], infer X] ? X : never;

type AnyMiddleware<In extends Universal.Context = any, Out extends Universal.Context = any, Fn extends AnyFn = AnyFn> =
  | UniversalHandler<In>
  | UniversalMiddleware<In, Out>
  | UniversalFn<UniversalHandler<In>, Fn>
  | UniversalFn<UniversalMiddleware<In, Out>, Fn>;

type ExtractUF<T> = T extends UniversalFn<infer _, infer Fn> ? Fn : never;

type ComposeReturnType<T extends AnyMiddleware[]> =
  Last<T> extends never
    ? T[number]
    : Last<T> extends UniversalHandler<any>
      ? UniversalHandler<In<First<T>>>
      : Last<T> extends UniversalMiddleware<any, any>
        ? UniversalMiddleware<In<First<T>>, In<Last<T>>>
        : Last<T> extends UniversalFn<UniversalHandler<any>, infer _>
          ? UniversalFn<UniversalHandler<In<First<T>>>, ExtractUF<Last<T>>>
          : Last<T> extends UniversalFn<UniversalMiddleware<any, any>, infer _>
            ? UniversalFn<UniversalMiddleware<In<First<T>>, In<Last<T>>>, ExtractUF<Last<T>>>
            : never;

type Cast<T extends AnyMiddleware, NewIn extends Universal.Context, NewOut extends Universal.Context> =
  T extends UniversalMiddleware<any, any>
    ? UniversalMiddleware<NewIn, NewOut>
    : T extends UniversalFn<UniversalHandler<any>, infer Fn>
      ? UniversalFn<UniversalHandler<NewIn>, Fn>
      : T extends UniversalFn<UniversalMiddleware<any, any>, infer Fn>
        ? UniversalFn<UniversalMiddleware<NewIn, NewOut>, Fn>
        : never;

type Pipe<F extends AnyMiddleware[]> = F extends []
  ? F
  : F extends [AnyMiddleware]
    ? F
    : F extends [infer F1 extends AnyMiddleware, infer F2 extends AnyMiddleware]
      ? [Cast<F1, In<F1>, Out<F1>>, Cast<F2, Out<F1>, Out<F2>>]
      : F extends [...infer X extends AnyMiddleware[], infer Y extends AnyMiddleware, infer L extends AnyMiddleware]
        ? [...Pipe<[...X, Y]>, Cast<L, Out<Y>, Out<L>>]
        : never;

/**
 * Composes a sequence of middlewares into a single middleware.
 * The `pipe` function takes an array of middleware functions and returns a new middleware function that
 * applies the input middleware functions in sequence to a given request and context.
 *
 * @example piping a universal middleware into a universal handler
 * ```js
 * const m = pipe(
 *   (request, context, runtime) => ({ status: "OK" }),
 *   (request, context, runtime) => new Response(context.status),
 * );
 *
 * const response = await m(request, context, runtime);
 *
 * console.log(await response.text()); // "OK"
 * ```
 *
 * The `pipe` function can also be applied to any combination of universal middlewares and adapter-specific middlewares.
 *
 * @example piping an express middleware into a universal handler
 * ```js
 * // Express middleware created thanks to universal-middleware
 * // It returns a { status: "OK" } Context.
 * import someExpressMiddleware from "my-lib/express";
 *
 * const m = pipe(
 *   someExpressMiddleware,
 *   (request, context, runtime) => new Response(context.status),
 * );
 *
 * const response = await m(request, context, runtime);
 *
 * console.log(await response.text()); // "OK"
 * ```
 *
 * @example piping a universal middleware into an express handler
 * ```js
 * // Express handler created thanks to universal-middleware
 * // It returns new Response(context.status).
 * import someExpressHandler from "my-lib/express";
 *
 * const m = pipe(
 *   (request, context, runtime) => ({ status: "OK" }),
 *   someExpressHandler,
 * );
 *
 * // The function signature always corresponds to the last middleware or handler given to the `pipe` function.
 * m(nodeRequest, nodeResponse);
 *
 * // Usage with an express `app`
 * app.use(m);
 * ```
 *
 * @see {@link https://universal-middleware.dev/helpers/pipe}
 * @returns A new middleware function that applies the input middleware functions in sequence.
 */
export function pipe<F extends AnyMiddleware[]>(
  // biome-ignore lint/suspicious/noConfusingVoidType: ignored
  this: { noCast?: boolean } | void,
  ...a: Pipe<F> extends F ? F : Pipe<F>
): ComposeReturnType<F> {
  const orderedArgs = ordered(a);
  const fn: UniversalMiddleware<any, any> = async function pipeInternal(request, context, runtime) {
    const { response, pending } = await runInOrder(orderedArgs, request, context, runtime);
    if (!response) {
      throw new Error("No Response found");
    }
    return applyResponseFunctions(response, pending);
  };

  if (!this?.noCast) {
    const lastMiddleware = (a as AnyMiddleware[]).at(-1);
    if (lastMiddleware && universalSymbol in lastMiddleware) {
      return bindUniversal(fn, lastMiddleware) as ComposeReturnType<F>;
    }
  }

  return fn as ComposeReturnType<F>;
}

/**
 * Composes middlewares that aren't handlers, and passes the request on when none of them answers.
 * `before` run in order until one answers. `after`, the post-handler ones, run once there is a response: right away
 * when one of `before` answers, else on the response of what comes next. Every response function then applies to it,
 * in order.
 */
export function pipeMiddlewares(before: EnhancedMiddleware[], after: EnhancedMiddleware[]): UniversalMiddleware {
  return async function pipeMiddlewaresInternal(request, context, runtime) {
    // The server takes a context or a response function from a middleware, not both: its context stays the one the
    // route and every response function see
    const first = await runInOrder(before, request, context, runtime, { untilAnswer: true, inPlace: true });
    const finish = async (response: Response) => {
      const rest = await runInOrder(after, request, context, runtime, { answer: response, inPlace: true });
      return applyResponseFunctions(response, [...first.pending, ...rest.pending]);
    };
    if (first.response) {
      return finish(first.response);
    }
    if (first.pending.length === 0 && after.length === 0) {
      return context;
    }
    return finish;
  };
}

type ResponseFunction = (response: Response) => Awaitable<Response | undefined>;
type LendingRequest = Request & { [nextRequestSymbol]?: (runtime: RuntimeAdapter) => Awaitable<Request> };

// Every middleware runs, a handler (or any, with `untilAnswer`) only until something answers. The first Response
// answers; a later one is ignored. A returned context replaces `context`, or with `inPlace` its contents.
async function runInOrder(
  middlewares: EnhancedMiddleware[],
  request: Request,
  context: Universal.Context,
  runtime: RuntimeAdapter,
  {
    answer: response,
    untilAnswer = false,
    inPlace = false,
  }: { answer?: Response; untilAnswer?: boolean; inPlace?: boolean } = {},
) {
  const pending: ResponseFunction[] = [];
  for (const [i, m] of middlewares.entries()) {
    if (response && (untilAnswer || isHandler(m))) {
      continue;
    }
    // An adapter that lets every middleware read the body (Express, Elysia) lends it again once a middleware read it,
    // until one answers: the answer may still be reading it. The rest of the Request, headers included, stays as the
    // middlewares left it. A body Express parsed before the list can't be lent again.
    const nextRequest = (request as LendingRequest)[nextRequestSymbol];
    if (i > 0 && !response && nextRequest && request.bodyUsed) {
      const { body, bodyUsed } = await nextRequest(runtime);
      if (!bodyUsed) {
        // @ts-expect-error RequestInit: duplex option is required when sending a body
        request = Object.assign(new Request(request, { body, duplex: "half" }), { [nextRequestSymbol]: nextRequest });
      }
    }

    const result = await getUniversal(m)(request, context ?? {}, runtime);

    if (typeof result === "function") {
      pending.push(result);
    } else if (result instanceof Response) {
      // Only a response function replaces the answer
      if (response) {
        cancelReplacedBody(result, response);
      } else {
        response = result;
      }
    } else if (result !== null && typeof result === "object" && result !== context) {
      if (inPlace) {
        for (const key of Object.keys(context)) delete context[key];
        Object.assign(context, result);
      } else {
        context = result;
      }
    }
  }
  return { response, pending, context };
}

async function applyResponseFunctions(response: Response, pending: ResponseFunction[]) {
  for (const m of pending) {
    const r = await m(response);
    if (r) {
      cancelReplacedBody(response, r);
      response = r;
    }
  }
  return response;
}
