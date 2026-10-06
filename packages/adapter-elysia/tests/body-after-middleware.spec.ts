import type { UniversalMiddleware } from "@universal-middleware/core";
import { Elysia } from "elysia";
import { describe, expect, it } from "vitest";
import { apply } from "../src/index.js";

// A universal middleware registered before a route must leave Elysia's own body parsing alone.

function build(middleware: UniversalMiddleware) {
  const app = new Elysia();
  apply(app, [middleware]);
  return app.post("/echo", (c) => ({ got: c.body }));
}

function post(app: ReturnType<typeof build>, body: string, contentType: string) {
  return app.handle(
    new Request("http://localhost/echo", { method: "POST", headers: { "content-type": contentType }, body }),
  );
}

describe("body after a universal middleware", () => {
  it("still reaches the route after the middleware read the body", async () => {
    let seen: string | undefined;
    const res = await post(
      build(async (request) => {
        seen = await request.text();
      }),
      JSON.stringify({ a: 1 }),
      "application/json",
    );
    expect(seen).toBe('{"a":1}');
    expect(await res.json()).toEqual({ got: { a: 1 } });
  });
});
