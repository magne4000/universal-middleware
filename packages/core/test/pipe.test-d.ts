import type { UniversalHandler, UniversalMiddleware } from "@universal-middleware/core";
import { expectTypeOf, test } from "vitest";
import { pipe } from "../src/pipe";
import type { UniversalFn } from "../src/types";

type M1 = UniversalMiddleware<{ a: 1 }, { a: 1; b: 2 }>;
type M2 = UniversalMiddleware<{ a: 1; b: 2 }, { a: 1; b: 2; c: 3 }>;
type M3 = UniversalMiddleware<{ a: 1; b: 2; c: 3 }, { a: 1; b: 2; c: 3 }>;
type H1 = UniversalHandler<{ a: 1; b: 2; c: 3 }>;
type W = (a: number) => number;

test("pipe", () => {
  const m1: M1 = {} as any;
  const m2: M2 = {} as any;
  const m3: M3 = {} as any;
  const h1: H1 = {} as any;

  expectTypeOf(pipe(m3, h1)).toEqualTypeOf<UniversalHandler<{ a: 1; b: 2; c: 3 }>>(h1);
  expectTypeOf(
    pipe(
      m1,
      // @ts-expect-error
      h1,
    ),
  ).toEqualTypeOf<UniversalHandler<{ a: 1 }>>();
  expectTypeOf(pipe(m1, m2, m3, h1)).toEqualTypeOf<UniversalHandler<{ a: 1 }>>();
  expectTypeOf(
    pipe(
      m1,
      m1,
      // @ts-expect-error
      h1,
    ),
  ).toEqualTypeOf<UniversalHandler<{ a: 1 }>>();
  expectTypeOf(
    pipe(
      m1,
      // @ts-expect-error
      m3,
      h1,
    ),
  ).toEqualTypeOf<UniversalHandler<{ a: 1 }>>();

  expectTypeOf(pipe(m1, m2, m3)).toEqualTypeOf<UniversalMiddleware<{ a: 1 }, { a: 1; b: 2; c: 3 }>>();

  expectTypeOf(pipe((_: Request) => new Response(null))).toEqualTypeOf<UniversalHandler>();
  expectTypeOf(
    pipe(
      () => {
        return {
          a: "1",
        };
      },
      (_a: Request, c: { a: string }) => new Response(c.a),
    ),
  ).toEqualTypeOf<UniversalHandler>();

  // Wrapped middlewares
  const mw1: UniversalFn<M1, W> = {} as any;
  const mw2: UniversalFn<M2, W> = {} as any;
  const mw3: UniversalFn<M3, W> = {} as any;
  const hw1: UniversalFn<H1, W> = {} as any;

  expectTypeOf(pipe(m3, hw1)).toEqualTypeOf<UniversalFn<UniversalHandler<{ a: 1; b: 2; c: 3 }>, W>>();
  expectTypeOf(pipe(mw3, hw1)).toEqualTypeOf<UniversalFn<UniversalHandler<{ a: 1; b: 2; c: 3 }>, W>>();
  expectTypeOf(pipe(m3, h1)).toEqualTypeOf<UniversalHandler<{ a: 1; b: 2; c: 3 }>>();

  expectTypeOf(pipe(m1, m2, m3, hw1)).toEqualTypeOf<UniversalFn<UniversalHandler<{ a: 1 }>, W>>();
  expectTypeOf(pipe(m1, m2, mw3, hw1)).toEqualTypeOf<UniversalFn<UniversalHandler<{ a: 1 }>, W>>();
  expectTypeOf(pipe(m1, mw2, mw3, hw1)).toEqualTypeOf<UniversalFn<UniversalHandler<{ a: 1 }>, W>>();
  expectTypeOf(pipe(mw1, mw2, mw3, hw1)).toEqualTypeOf<UniversalFn<UniversalHandler<{ a: 1 }>, W>>();
  expectTypeOf(pipe(mw1, mw2, m3, hw1)).toEqualTypeOf<UniversalFn<UniversalHandler<{ a: 1 }>, W>>();
  expectTypeOf(pipe(mw1, m2, mw3, hw1)).toEqualTypeOf<UniversalFn<UniversalHandler<{ a: 1 }>, W>>();
  expectTypeOf(pipe(m1, mw2, mw3, hw1)).toEqualTypeOf<UniversalFn<UniversalHandler<{ a: 1 }>, W>>();

  expectTypeOf(pipe(m1, m2, m3, h1)).toEqualTypeOf<UniversalHandler<{ a: 1 }>>();
  expectTypeOf(pipe(m1, m2, mw3, h1)).toEqualTypeOf<UniversalHandler<{ a: 1 }>>();
  expectTypeOf(pipe(m1, mw2, mw3, h1)).toEqualTypeOf<UniversalHandler<{ a: 1 }>>();
  expectTypeOf(pipe(mw1, mw2, mw3, h1)).toEqualTypeOf<UniversalHandler<{ a: 1 }>>();
  expectTypeOf(pipe(mw1, mw2, m3, h1)).toEqualTypeOf<UniversalHandler<{ a: 1 }>>();
  expectTypeOf(pipe(mw1, m2, mw3, h1)).toEqualTypeOf<UniversalHandler<{ a: 1 }>>();
  expectTypeOf(pipe(m1, mw2, mw3, h1)).toEqualTypeOf<UniversalHandler<{ a: 1 }>>();
});
