import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import type { UniversalMiddleware } from "@universal-middleware/core";
import { Elysia } from "elysia";
import { describe, expect, it, vi } from "vitest";
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

  it("still parses a multipart form for the route after the middleware read it", async () => {
    let seen: string | undefined;
    const form = new FormData();
    form.set("a", "1");
    const app = build(async (request) => {
      seen = await request.text();
    });
    const res = await app.handle(new Request("http://localhost/echo", { method: "POST", body: form }));
    expect(seen).toContain('name="a"');
    expect(await res.json()).toEqual({ got: { a: "1" } });
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

// A route with `parse: "none"` reads `request.body` itself, as an upload handler would.
const streamedBytes = async ({ request }: { request: Request }) => {
  const reader = (request.body as ReadableStream<Uint8Array>).getReader();
  let bytes = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return { bytes };
    bytes += value.length;
  }
};

describe("streaming route after a universal middleware", () => {
  const streamRoute = (middleware: UniversalMiddleware) => {
    const app = new Elysia();
    apply(app, [middleware]);
    return app.post("/stream", streamedBytes, { parse: "none" });
  };

  it("streams the body without copying the request", async () => {
    const clone = vi.spyOn(Request.prototype, "clone");
    try {
      const res = await streamRoute(async () => {}).handle(
        new Request("http://localhost/stream", { method: "POST", body: '{"a":1}' }),
      );
      expect(await res.json()).toEqual({ bytes: 7 });
      expect(clone).not.toHaveBeenCalled();
    } finally {
      clone.mockRestore();
    }
  });

  it("gives the middleware the bytes and the route the whole stream when the middleware reads the body", async () => {
    let seen: string | undefined;
    const res = await streamRoute(async (request) => {
      seen = await request.text();
    }).handle(new Request("http://localhost/stream", { method: "POST", body: '{"a":1}' }));
    expect(seen).toBe('{"a":1}');
    expect(await res.json()).toEqual({ bytes: 7 });
  });
  it("works for a middleware registered again inside a group", async () => {
    const noop = createMiddleware(() => async () => {});
    const app = new Elysia().use(noop()).group("/g", (g) => g.use(noop()).post("/j", (c) => ({ got: c.body })));
    const url = "http://localhost/g/j";
    const res = await app.handle(
      new Request(url, { method: "POST", headers: { "content-type": "application/json" }, body: '{"a":1}' }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ got: { a: 1 } });
    expect((await app.handle(new Request(url))).status).toBe(404);
  });
});

// Above the eager limit the middleware's body is built lazily, from the kept bytes or a copy of the stream.
describe("a body above the eager limit", () => {
  const big = (text: string, contentType: string) =>
    new Request("http://localhost/big", {
      method: "POST",
      headers: { "content-type": contentType, "content-length": String(new TextEncoder().encode(text).length) },
      body: text,
    });

  it("is seen in full by a middleware and by the route that parses it", async () => {
    let seen = 0;
    const app = new Elysia();
    const middleware: UniversalMiddleware = async (request) => {
      seen = (await request.text()).length;
    };
    apply(app, [middleware]);
    app.post("/big", (c) => ({ got: (c.body as { a: string }).a.length }));
    const text = JSON.stringify({ a: "x".repeat(70 * 1024) });
    const res = await app.handle(big(text, "application/json"));
    expect(seen).toBe(text.length);
    expect(await res.json()).toEqual({ got: 70 * 1024 });
  });

  it("does not hang a middleware that awaits cancel() after a partial read, and the route still streams it all", async () => {
    const size = 300_000;
    const app = new Elysia();
    const middleware: UniversalMiddleware = async (request) => {
      const reader = (request.body as ReadableStream<Uint8Array>).getReader();
      await reader.read();
      await reader.cancel("enough");
    };
    apply(app, [middleware]);
    app.post("/big", streamedBytes, { parse: "none" });
    const res = await app.handle(big("z".repeat(size), "application/octet-stream"));
    expect(await res.json()).toEqual({ bytes: size });
  });
});

// Bun's native request: an eager `request.clone()` in `onRequest` used to lock the body the route streams.
describe.runIf(spawnSync("bun", ["--version"]).status === 0)("on Bun", () => {
  it("streams the body of a route with parse none after a universal middleware that reads it", async () => {
    const source = fileURLToPath(new URL("../src/index.ts", import.meta.url));
    const script = `
      import { Elysia } from "elysia";
      import { createMiddleware } from ${JSON.stringify(source)};
      const app = new Elysia()
        .use(createMiddleware(() => async (request) => { await request.text(); })())
        .post("/stream", ${streamedBytes.toString()}, { parse: "none" })
        .listen(0);
      console.log(app.server.port);
    `;
    const server = spawn("bun", ["-e", script], { cwd: fileURLToPath(new URL("..", import.meta.url)) });
    try {
      const port = await new Promise<string>((resolve, reject) => {
        server.stdout.once("data", (data) => resolve(String(data).trim()));
        server.once("error", reject);
        server.once("exit", () => reject(new Error("bun exited before listening")));
      });
      const res = await fetch(`http://localhost:${port}/stream`, { method: "POST", body: '{"a":1}' });
      expect(await res.json()).toEqual({ bytes: 7 });
    } finally {
      server.kill();
    }
  });
});
