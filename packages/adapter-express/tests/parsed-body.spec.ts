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
  it("lets the middleware read a body express.json() already parsed", async () => {
    let seen: string | undefined;
    const res = await post(
      express.json(),
      async (request) => {
        seen = await request.text();
      },
      '{"a":1}',
      "application/json",
    );
    expect(res.status).toBe(200);
    expect(seen).toBe('{"a":1}');
    expect(await res.json()).toEqual({ got: { a: 1 } });
  });

  it("gives no body when the parsed body can't be rebuilt exactly (multipart)", async () => {
    const multipart: express.RequestHandler = (req, _res, next) => {
      req.on("data", () => {});
      req.on("end", () => {
        req.body = { a: "1" };
        next();
      });
    };
    let seen: string | undefined;
    const res = await post(
      multipart,
      async (request) => {
        seen = await request.text();
      },
      '--b\r\nContent-Disposition: form-data; name="a"\r\n\r\n1\r\n--b--\r\n',
      "multipart/form-data; boundary=b",
    );
    expect(res.status).toBe(200);
    expect(seen).toBe("");
  });
});
