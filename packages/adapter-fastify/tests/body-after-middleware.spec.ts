import http2 from "node:http2";
import type { AddressInfo } from "node:net";
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

  it("reaches the middleware over HTTP/2 without a Content-Length", async () => {
    let seen: string | undefined;
    const app = Fastify({ http2: true });
    const middleware: UniversalMiddleware = async (request) => {
      seen = await request.text();
    };
    // biome-ignore lint/suspicious/noExplicitAny: an HTTP/2 instance isn't assignable to the default `App`
    await apply(app as any, [middleware]);
    app.post("/echo", async (req) => ({ got: req.body }));
    await app.listen({ port: 0 });
    const client = http2.connect(`http://localhost:${(app.server.address() as AddressInfo).port}`);
    const req = client.request({ ":method": "POST", ":path": "/echo", "content-type": "application/json" });
    req.end(JSON.stringify({ a: 1 }));
    req.resume();
    await new Promise((resolve) => req.on("end", resolve));
    client.close();
    await app.close();
    expect(seen).toBe('{"a":1}');
  });
});
