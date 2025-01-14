import { universalSymbol } from "./const";
import type { AnyFn, Awaitable, UniversalFn, UniversalHandler, UniversalMiddleware } from "./types";
import { bindUniversal, getUniversal, ordered } from "./utils";

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

type ComposeReturnType<T extends AnyMiddleware[]> = Last<T> extends never
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

type Cast<
  T extends AnyMiddleware,
  NewIn extends Universal.Context,
  NewOut extends Universal.Context,
> = T extends UniversalMiddleware<any, any>
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
  const ordererArgs = ordered(a);
  const fn: UniversalMiddleware<any, any> = async function pipeInternal(request, context, runtime) {
    const pending: ((response: Response) => Awaitable<Response>)[] = [];

    let _response: Response | undefined = undefined;
    for (const m of ordererArgs) {
      const um = getUniversal(m);
      const response = await um(request, context ?? {}, runtime);

      if (typeof response === "function") {
        pending.push(response);
      } else if (response !== null && typeof response === "object") {
        // Do not override response if it already exists.
        // The only to actually update the response is through a Response Function.
        if (!_response && response instanceof Response) {
          _response = response;
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
