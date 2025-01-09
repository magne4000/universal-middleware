import { describe, expect, test } from "vitest";
import { cloneFunction } from "../src/utils";

describe.each([
  {
    original: function original(arg: string) {
      return arg + arg;
    } as any,
    name: "regular function",
  },
  {
    original: (arg: string) => {
      return arg + arg;
    },
    name: "arrow function",
  },
])("cloneFunction: $name", ({ original }) => {
  test("execution", () => {
    const clone = cloneFunction(original);

    expect(original("a")).toEqual("aa");
    expect(clone("a")).toEqual("aa");
  });

  test("props inheritance", () => {
    original.propa = "a";
    original.propb = "b";

    const clone = cloneFunction(original);
    clone.propb = "c";

    expect(original.propa).toEqual("a");
    expect(original.propb).toEqual("b");
    expect(clone.propa).toEqual("a");
    expect(clone.propb).toEqual("c");
  });
});
