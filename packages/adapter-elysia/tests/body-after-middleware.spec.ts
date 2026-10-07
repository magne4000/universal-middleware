import type { UniversalMiddleware } from "@universal-middleware/core";
import { Elysia } from "elysia";
import { describe, expect, it } from "vitest";
import { apply, createMiddleware } from "../src/index.js";

// A universal middleware registered before a route must leave Elysia's own body parsing alone.

function build(middleware: UniversalMiddleware, app: Elysia = new Elysia()) {
  apply(app, [middleware]);
  return app.post("/echo", (c) => ({ got: c.body }));
}

function post(app: { handle: (request: Request) => Response | Promise<Response> }, body: string, contentType: string) {
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

  it("still sees the body when an earlier onParse hook consumed it", async () => {
    let seen: string | undefined;
    const app = build(
      async (request) => {
        seen = await request.text();
      },
      new Elysia().onParse(async ({ request }) => ({ parsed: await request.text() })),
    );
    const res = await post(app, JSON.stringify({ a: 1 }), "application/json");
    expect(seen).toBe('{"a":1}');
    expect(await res.json()).toEqual({ got: { parsed: '{"a":1}' } });
  });

  it("still reaches the route when the middleware is added with app.use() instead of apply()", async () => {
    let seen: string | undefined;
    const middleware = createMiddleware(() => async (request) => {
      seen = await request.text();
    })();
    const app = new Elysia().use(middleware).post("/echo", (c) => ({ got: c.body }));
    const res = await post(app, JSON.stringify({ a: 1 }), "application/json");
    expect(res.status).toBe(200);
    expect(seen).toBe('{"a":1}');
    expect(await res.json()).toEqual({ got: { a: 1 } });
  });
});
