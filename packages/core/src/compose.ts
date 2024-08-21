/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Awaitable, UniversalHandler, UniversalMiddleware } from "./types";

type Out<T> = T extends UniversalMiddleware<any, infer C> ? C : never;
type In<T> =
  T extends UniversalHandler<infer C>
    ? C
    : T extends UniversalMiddleware<infer C, any>
      ? C
      : never;
type Last<T extends any[]> = T extends [...any[], infer X] ? X : never;
type First<T extends any[]> = T extends [infer X, ...any[]] ? X : never;

type PipeM<F extends UniversalMiddleware<any, any>[]> = F extends []
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
        ? [...PipeM<[...X, Y]>, UniversalMiddleware<Out<Y>, D1>]
        : never;

type Pipe<
  F extends [...UniversalMiddleware<any, any>[], UniversalHandler<any>],
> = F extends []
  ? F
  : F extends [UniversalHandler<any>]
    ? F
    : F extends [UniversalMiddleware<infer A, infer Out>, UniversalHandler<any>]
      ? [UniversalMiddleware<A, Out>, UniversalHandler<Out>]
      : F extends [
            ...infer M extends UniversalMiddleware<any, any>[],
            UniversalHandler<any>,
          ]
        ? [...PipeM<M>, UniversalHandler<Out<Last<M>>>]
        : never;

export function compose<
  F extends [...UniversalMiddleware<any, any>[], UniversalHandler<any>],
>(...a: Pipe<F>): UniversalHandler<In<First<F>>> {
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
