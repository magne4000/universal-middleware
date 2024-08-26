/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Awaitable, UniversalHandler, UniversalMiddleware } from "./types";

type Out<T> = T extends UniversalMiddleware<any, infer C> ? C : never;
type In<T> =
  T extends UniversalHandler<infer C>
    ? C
    : T extends UniversalMiddleware<infer C, any>
      ? C
      : never;
type First<T extends any[]> = T extends [infer X, ...any[]] ? X : never;
type Last<T extends any[]> = T extends [...any[], infer X] ? X : never;

type ComposeReturnType<T extends UniversalMiddleware<any, any>[]> =
  Last<T> extends UniversalHandler<any>
    ? UniversalHandler<In<First<T>>>
    : UniversalMiddleware<In<First<T>>, In<Last<T>>>;

type Pipe<F extends UniversalMiddleware<any, any>[]> = F extends []
  ? F
  : F extends [UniversalMiddleware<any, any>]
    ? F
    : F extends [
          UniversalMiddleware<infer A, infer B>,
          UniversalMiddleware<any, infer D>,
        ]
      ? [UniversalMiddleware<A, B>, UniversalMiddleware<B, D>]
      : F extends [
            ...infer X extends UniversalMiddleware<any, any>[],
            infer Y extends UniversalMiddleware<any, any>,
            UniversalMiddleware<any, infer D1>,
          ]
        ? [...Pipe<[...X, Y]>, UniversalMiddleware<Out<Y>, D1>]
        : never;

export function pipe<F extends UniversalMiddleware<any, any>[]>(
  ...a: Pipe<F> extends F ? F : Pipe<F>
): ComposeReturnType<F> {
  const middlewares = a as UniversalMiddleware[];
  const handler = a.pop() as UniversalHandler;

  return async (request, context, runtime) => {
    const pending: ((response: Response) => Awaitable<Response>)[] = [];

    for (const m of middlewares) {
      const response = await m(request, context, runtime);

      if (typeof response === "function") {
        pending.push(response);
      } else if (response !== null && typeof response === "object") {
        if (response instanceof Response) {
          return response;
        }
        // Update context
        context = response as any;
      }
    }

    let response = await handler(request, context, runtime);

    for (const m of pending) {
      const r = await m(response);
      if (r) {
        response = r;
      }
    }

    return response;
  };
}
