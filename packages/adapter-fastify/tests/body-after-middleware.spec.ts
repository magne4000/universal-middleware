import type { UniversalMiddleware } from "@universal-middleware/core";
import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import { apply } from "../src/index.js";

// A universal middleware registered before a route must not break that route's POST body.

async function post(middleware: UniversalMiddleware, body: string) {
  const app = Fastify();
  await apply(app, [middleware]);
  app.post("/echo", async (req) => ({ got: req.body }));
  const res = await app.inject({
    method: "POST",
    url: "/echo",
    headers: { "content-type": "application/json" },
    payload: body,
  });
  await app.close();
  return res;
}

describe("body after a universal middleware", () => {
  it("reaches the middleware and the route without fastify-raw-body", async () => {
    let seen: string | undefined;
    const res = await post(
      async (request) => {
        seen = await request.text();
      },
      JSON.stringify({ a: 1 }),
    );
    expect(res.statusCode).toBe(200);
    expect(seen).toBe('{"a":1}');
    expect(res.json()).toEqual({ got: { a: 1 } });
  });

  it("reaches the route and the middleware when the JSON body is falsy", async () => {
    let seen: string | undefined;
    const res = await post(async (request) => {
      seen = await request.text();
    }, "0");
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ got: 0 });
    expect(seen).toBe("0");
  });
});
