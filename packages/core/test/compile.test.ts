import { describe, expect, test } from "vitest";
import { compileEnhance, MiddlewareOrder } from "../src";

describe("compileEnhance", () => {
  test("basic", () => {
    expect(
      compileEnhance("mod", {
        path: "/**",
        method: "GET",
        name: "name",
        order: MiddlewareOrder.CORS,
      }),
    ).toEqual(
      'mod[Symbol.for("unPath")]="/**";' +
        'mod[Symbol.for("unMethod")]="GET";' +
        'mod[Symbol.for("unName")]="name";' +
        'mod[Symbol.for("unOrder")]=-600;',
    );
    expect(
      compileEnhance("mod", {
        method: ["GET", "POST"],
      }),
    ).toEqual('mod[Symbol.for("unMethod")]=["GET","POST"];');
    expect(
      compileEnhance("mod", {
        context: {
          a: "a",
        },
      }),
    ).toEqual('mod[Symbol.for("unContext")]={"a":"a"};');
  });
});
