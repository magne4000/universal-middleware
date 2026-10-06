import type { UniversalMiddleware } from "@universal-middleware/core";
import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import { apply } from "../src/index.js";

// A universal middleware registered before a route must not break that route's POST body.

async function post(middleware: UniversalMiddleware, body: string, contentType = "application/json") {
  const app = Fastify();
  await apply(app, [middleware]);
  app.post("/echo", async (req) => ({ got: req.body }));
  const res = await app.inject({
    method: "POST",
    url: "/echo",
    headers: { "content-type": contentType },
    payload: body,
  });
  await app.close();
  return res;
}

describe("body after a universal middleware", () => {
  it("reaches the route when the middleware never reads it", async () => {
    const res = await post(async () => {}, JSON.stringify({ a: 1 }));
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ got: { a: 1 } });
  });

  it("is readable by the middleware without fastify-raw-body, and still reaches the route", async () => {
    let seen: string | undefined;
    const res = await post(
      async (request) => {
        seen = await request.text();
      },
      JSON.stringify({ a: 1 }),
    );
    expect(seen).toBe('{"a":1}');
    expect(res.json()).toEqual({ got: { a: 1 } });
  });

  it("hands a text body to the middleware as sent", async () => {
    let seen: string | undefined;
    const res = await post(
      async (request) => {
        seen = await request.text();
      },
      "hello",
      "text/plain",
    );
    expect(seen).toBe("hello");
    expect(res.json()).toEqual({ got: "hello" });
  });
});
