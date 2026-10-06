import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import type { UniversalMiddleware } from "@universal-middleware/core";
import express from "express";
import { afterEach, describe, expect, it } from "vitest";
import { apply } from "../src/index.js";

// A body parser registered before the universal middleware has already consumed the request stream.
// The middleware must see the parsed body and the next handler must still get it.

let server: Server | undefined;

afterEach(() => {
  server?.close();
  server = undefined;
});

async function post(
  parser: express.RequestHandler,
  middleware: UniversalMiddleware,
  body: string,
  contentType: string,
): Promise<Response> {
  const app = express();
  app.use(parser);
  apply(app, [middleware]);
  app.post("/echo", (req, res) => res.json({ got: req.body }));
  const s = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, () => resolve(listening));
  });
  server = s;
  return fetch(`http://localhost:${(s.address() as AddressInfo).port}/echo`, {
    method: "POST",
    headers: { "content-type": contentType },
    body,
    signal: AbortSignal.timeout(3000),
  });
}

describe("body parsed before a universal middleware", () => {
  it("doesn't fail when the middleware never reads a JSON body", async () => {
    const res = await post(express.json(), async () => {}, JSON.stringify({ a: 1 }), "application/json");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ got: { a: 1 } });
  });

  it.each([
    ["JSON", express.json(), '{"a":1}', "application/json", '{"a":1}'],
    ["text", express.text(), "hello", "text/plain", "hello"],
    ["urlencoded", express.urlencoded({ extended: false }), "a=1&b=2", "application/x-www-form-urlencoded", "a=1&b=2"],
    ["raw", express.raw({ type: "application/octet-stream" }), "bytes", "application/octet-stream", "bytes"],
  ])("lets the middleware read a parsed %s body", async (_name, parser, body, contentType, expected) => {
    let seen: string | undefined;
    const res = await post(
      parser,
      async (request) => {
        seen = await request.text();
      },
      body,
      contentType,
    );
    expect(res.status).toBe(200);
    expect(seen).toBe(expected);
  });
});
