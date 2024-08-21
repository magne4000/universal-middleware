/* eslint-disable @typescript-eslint/no-explicit-any */
import { expectTypeOf, test } from "vitest";
import type {
  UniversalHandler,
  UniversalMiddleware,
} from "@universal-middleware/core";
import { pipe } from "../src/pipe";

type M1 = UniversalMiddleware<{ a: 1 }, { a: 1; b: 2 }>;
type M2 = UniversalMiddleware<{ a: 1; b: 2 }, { a: 1; b: 2; c: 3 }>;
type M3 = UniversalMiddleware<{ a: 1; b: 2; c: 3 }, { a: 1; b: 2; c: 3 }>;
type H1 = UniversalHandler<{ a: 1; b: 2; c: 3 }>;

test("compose", () => {
  const m1: M1 = {} as any;
  const m2: M2 = {} as any;
  const m3: M3 = {} as any;
  const h1: H1 = {} as any;

  expectTypeOf(pipe(m3, h1)).toEqualTypeOf<
    UniversalHandler<{ a: 1; b: 2; c: 3 }>
  >(h1);
  expectTypeOf(
    pipe(
      m1,
      // @ts-expect-error
      h1,
    ),
  ).toEqualTypeOf<UniversalHandler<{ a: 1 }>>();
  expectTypeOf(pipe(m1, m2, m3, h1)).toEqualTypeOf<
    UniversalHandler<{ a: 1 }>
  >();
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

  expectTypeOf(pipe(m1, m2, m3)).toEqualTypeOf<
    UniversalMiddleware<{ a: 1 }, { a: 1; b: 2; c: 3 }>
  >();

  expectTypeOf(
    pipe((_: Request) => new Response(null)),
  ).toEqualTypeOf<UniversalHandler>();
  expectTypeOf(
    pipe(
      () => {
        return {
          a: "1",
        };
      },
      (a: Request, c: { a: string }) => new Response(c.a),
    ),
  ).toEqualTypeOf<UniversalHandler>();
});
