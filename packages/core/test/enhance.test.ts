import { describe, expect, test } from "vitest";
import { nameSymbol } from "../src/const";
import { enhance, getUniversalProp } from "../src/utils";

describe("enhance: name", () => {
  test("sets the function name", () => {
    const m = enhance(function original() {}, { name: "logger" });
    expect(m.name).toBe("logger");
    expect(getUniversalProp(m, nameSymbol)).toBe("logger");
  });

  test("does not rename the original", () => {
    const original = function original() {};
    enhance(original, { name: "logger" });
    expect(original.name).toBe("original");
  });

  test("immutable: false renames the function itself", () => {
    const original = function original() {};
    const m = enhance(original, { name: "logger", immutable: false });
    expect(m).toBe(original);
    expect(m.name).toBe("logger");
    expect(getUniversalProp(m, nameSymbol)).toBe("logger");
  });

  test("keeps the original name without a name option", () => {
    const m = enhance(function original() {}, { path: "/a" });
    expect(m.name).toBe("original");
    expect(getUniversalProp(m, nameSymbol)).toBeUndefined();
  });
});
