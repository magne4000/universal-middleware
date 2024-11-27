import { universalSymbol } from "./const";
import type { AnyFn, Awaitable, UniversalFn, UniversalHandler, UniversalMiddleware } from "./types";
import { bindUniversal } from "./utils";

type _Out<T> = T extends UniversalMiddleware<any, infer C> ? C : never;
type Out<T> = T extends UniversalFn<infer X, infer Y> ? _Out<X> : _Out<T>;
type _In<T> = T extends UniversalHandler<infer C> ? C : T extends UniversalMiddleware<infer C, any> ? C : never;
type In<T> = T extends UniversalFn<infer X, infer Y> ? _In<X> : _In<T>;
type First<T extends any[]> = T extends [infer X, ...any[]] ? X : never;
type Last<T extends any[]> = T extends [...any[], infer X] ? X : never;

type AnyMiddleware<In extends Universal.Context = any, Out extends Universal.Context = any, Fn extends AnyFn = AnyFn> =
  | UniversalMiddleware<In, Out>
  | UniversalFn<UniversalMiddleware<In, Out>, Fn>
  | UniversalFn<UniversalHandler<In>, Fn>;

type ComposeReturnType<T extends AnyMiddleware[]> = Last<T> extends UniversalFn<infer X, infer Y>
  ? X extends UniversalHandler<any>
    ? UniversalFn<UniversalHandler<In<First<T>>>, Y>
    : UniversalFn<UniversalMiddleware<In<First<T>>, In<Last<T>>>, Y>
  : Last<T> extends UniversalHandler<any>
    ? UniversalHandler<In<First<T>>>
    : UniversalMiddleware<In<First<T>>, In<Last<T>>>;

type Pipe<F extends AnyMiddleware[]> = F extends []
  ? F
  : F extends [AnyMiddleware]
    ? F
    : F extends [AnyMiddleware<infer A, infer B>, AnyMiddleware<any, infer D>]
      ? [AnyMiddleware<A, B>, AnyMiddleware<B, D>]
      : F extends [...infer X extends AnyMiddleware[], infer Y extends AnyMiddleware, AnyMiddleware<any, infer D1>]
        ? [...Pipe<[...X, Y]>, AnyMiddleware<Out<Y>, D1>]
        : never;

/**
 * Composes a sequence of middlewares into a single middleware.
 * The `pipe` function takes an array of middleware functions and returns a new middleware function that
 * applies the input middleware functions in sequence to a given request and context.
 *
 * @example piping a universal middleware into a universal handler
 * ```js
 * const m = pipe(
 *   (request, context, runtime) => return { status: "OK" },
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
 * // It returns a `{ status: "OK" }` Context.
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
 * // It returns `new Response(context.status)`.
 * import someExpressHandler from "my-lib/express";
 *
 * const m = pipe(
 *   (request, context, runtime) => return { status: "OK" },
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
export function pipe<F extends AnyMiddleware[]>(...a: Pipe<F> extends F ? F : Pipe<F>): ComposeReturnType<F> {
  const middlewares = (a as AnyMiddleware[]).map((m) => (universalSymbol in m ? m[universalSymbol] : m));

  const fn: UniversalMiddleware<any, any> = async function pipeInternal(request, context, runtime) {
    const pending: ((response: Response) => Awaitable<Response>)[] = [];

    let _response: Response | undefined = undefined;
    for (const m of middlewares) {
      const response = await m(request, context ?? {}, runtime);

      if (typeof response === "function") {
        pending.push(response);
      } else if (response !== null && typeof response === "object") {
        if (response instanceof Response) {
          _response = response;
          break;
        }
        // Update context
        // biome-ignore lint/style/noParameterAssign: <explanation>
        context = response as any;
      }
    }

    if (!_response) {
      throw new Error("No Response found");
    }

    for (const m of pending) {
      const r = await m(_response);
      if (r) {
        _response = r;
      }
    }

    return _response;
  };

  const lastMiddleware = (a as AnyMiddleware[]).at(-1);
  if (lastMiddleware && universalSymbol in lastMiddleware) {
    return bindUniversal(fn, lastMiddleware) as ComposeReturnType<F>;
  }

  return fn as ComposeReturnType<F>;
}
