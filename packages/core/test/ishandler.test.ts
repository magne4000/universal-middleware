import { describe, expect, test } from "vitest";
import { enhance, isHandler } from "../src/index";

describe("isHandler", () => {
  test("order 0 is a handler", () => {
    expect(isHandler(enhance(() => new Response("ok"), { order: 0 }))).toBe(true);
  });

  test("path without order is a handler", () => {
    expect(isHandler(enhance(() => new Response("ok"), { path: "/api" }))).toBe(true);
  });

  test("path with a non-zero order is not a handler", () => {
    expect(isHandler(enhance(() => new Response("ok"), { path: "/api", order: -800 }))).toBe(false);
  });

  test("no path and no order is not a handler", () => {
    expect(isHandler(enhance(() => new Response("ok"), {}))).toBe(false);
  });
});
