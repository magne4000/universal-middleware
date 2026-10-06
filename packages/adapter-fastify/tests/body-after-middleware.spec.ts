import type { UniversalMiddleware } from "@universal-middleware/core";
import Fastify, { type FastifyInstance } from "fastify";
import { describe, expect, it } from "vitest";
import { apply } from "../src/index.js";

// A universal middleware registered before a route must not break that route's POST body.

function serializable(body: unknown) {
  try {
    JSON.stringify(body);
    return body;
  } catch {
    return "circular";
  }
}

// A parser that consumes the stream and returns `value`, like @fastify/multipart does
function parsing(contentType: string, value: unknown) {
  return (app: FastifyInstance) =>
    app.addContentTypeParser(contentType, (_req, payload, done) => {
      payload.on("end", () => done(null, value));
      payload.resume();
    });
}

async function post(
  middleware: UniversalMiddleware,
  body: string,
  contentType = "application/json",
  setup?: (app: FastifyInstance) => void,
) {
  const app = Fastify();
  setup?.(app);
  await apply(app, [middleware]);
  app.post("/echo", async (req) => ({ got: serializable(req.body) }));
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

  it("reaches the route and the middleware when the JSON body is falsy", async () => {
    let seen: string | undefined;
    const res = await post(
      async (request) => {
        seen = await request.text();
      },
      "0",
      "application/json",
    );
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ got: 0 });
    expect(seen).toBe("0");
  });

  it("keeps the JSON encoding of a string body", async () => {
    let seen: string | undefined;
    await post(async (request) => {
      seen = await request.text();
    }, '"x"');
    expect(seen).toBe('"x"');
  });

  it("gives no body for a multipart parser that returns an object, even a circular one", async () => {
    const seen: string[] = [];
    const circular: Record<string, unknown> = { a: { type: "field", value: "1" } };
    circular.self = circular;
    const res = await post(
      async (request) => {
        seen.push(await request.text());
      },
      "--b--",
      "multipart/form-data; boundary=b",
      parsing("multipart/form-data", circular),
    );
    expect(res.statusCode).toBe(200);
    expect(seen).toEqual([""]);
  });

  it("gives no body for nested urlencoded values", async () => {
    let seen: string | undefined;
    await post(
      async (request) => {
        seen = await request.text();
      },
      "a[b]=1&d=x&d=y",
      "application/x-www-form-urlencoded",
      parsing("application/x-www-form-urlencoded", { a: { b: "1" }, d: ["x", "y"] }),
    );
    expect(seen).toBe("");
  });

  it("gives no body for a circular JSON object", async () => {
    let seen: string | undefined;
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    const res = await post(
      async (request) => {
        seen = await request.text();
      },
      "{}",
      "application/json",
      parsing("application/json", circular),
    );
    expect(res.statusCode).toBe(200);
    expect(seen).toBe("");
  });

  it("keeps an empty body empty", async () => {
    let seen: string | undefined;
    const app = Fastify();
    app.addContentTypeParser("application/json", (_req, payload, done) => {
      payload.on("end", () => done(null, {}));
      payload.resume();
    });
    await apply(app, [
      async (request: Request) => {
        seen = await request.text();
      },
    ]);
    app.post("/echo", async () => "ok");
    const res = await app.inject({ method: "POST", url: "/echo", headers: { "content-type": "application/json" } });
    await app.close();
    expect(res.statusCode).toBe(200);
    expect(seen).toBe("");
  });
});
