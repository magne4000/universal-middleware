import { enhance } from "@universal-middleware/core";
import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import { apply, createHandler } from "../src/index.js";

// A HEAD response has no body: an endless body (SSE, a proxied stream) must be cancelled, not awaited.

function idleStream() {
  let onCancel!: () => void;
  const cancelled = new Promise<boolean>((resolve) => {
    onCancel = () => resolve(true);
  });
  const state = {
    cancelled: false,
    wasCancelled: Promise.race([cancelled, new Promise<boolean>((r) => setTimeout(() => r(false), 1500))]),
  };
  const response = new Response(
    new ReadableStream<Uint8Array>({
      pull: () => new Promise<void>(() => {}),
      cancel() {
        state.cancelled = true;
        onCancel();
      },
    }),
    { headers: { "content-type": "text/event-stream", "x-kept": "yes" } },
  );
  return { state, response };
}

async function head(app: ReturnType<typeof Fastify>) {
  const host = await app.listen({ port: 0, host: "127.0.0.1" });
  const ctrl = new AbortController();
  try {
    const res = await Promise.race([
      fetch(`${host}/events`, { method: "HEAD", signal: ctrl.signal }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
    ]);
    // Node 22 fails a body read after the abort below, so read it first.
    return res && new Response(await res.arrayBuffer(), res);
  } finally {
    ctrl.abort();
    app.server.closeAllConnections();
    await app.close();
  }
}

describe("HEAD with an endless body", () => {
  it("completes and cancels the body of a middleware without path", async () => {
    const { state, response } = idleStream();
    const app = Fastify();
    await apply(app, [enhance(() => response, { name: "sse", order: -100 })]);

    const res = await head(app);

    expect(res, "HEAD never completed: the body stream is still awaited").not.toBeNull();
    expect(res?.status).toBe(200);
    expect(res?.headers.get("content-type")).toBe("text/event-stream");
    expect(res?.headers.get("x-kept")).toBe("yes");
    expect(state.cancelled).toBe(true);
  });

  it("completes and cancels the body of a handler", async () => {
    const { state, response } = idleStream();
    const app = Fastify();
    app.route({ method: "HEAD", url: "/events", handler: createHandler(() => () => response)() });

    const res = await head(app);

    expect(res, "HEAD never completed: the body stream is still awaited").not.toBeNull();
    expect(res?.headers.get("x-kept")).toBe("yes");
    expect(state.cancelled).toBe(true);
  });

  it("cancels the body a response function swaps in", async () => {
    const { state, response } = idleStream();
    const app = Fastify();
    await apply(app, [enhance(() => () => response, { name: "swap", order: -100 })]);
    app.route({ method: "HEAD", url: "/events", handler: () => "ok" });

    const res = await head(app);

    expect(res, "HEAD never completed").not.toBeNull();
    expect(res?.headers.get("x-kept")).toBe("yes");
    expect(await state.wasCancelled, "the replacement body was leaked").toBe(true);
  });

  it.each([
    ["route", {}],
    ["path-scoped middleware", { order: -100 }],
  ])("answers HEAD from a GET-only %s and cancels the body", async (_, options) => {
    const { state, response } = idleStream();
    const app = Fastify();
    await apply(app, [enhance(() => response, { method: "GET", path: "/events", ...options })]);

    const res = await head(app);

    expect(res, "HEAD never completed: the body stream is still awaited").not.toBeNull();
    expect(res?.status).toBe(200);
    expect(state.cancelled).toBe(true);
  });
});

describe("HEAD with a response function", () => {
  const source = () => new Response('"hello"', { status: 201, headers: { "x-kept": "old" } });

  async function headWith(fn: (res: Response) => Response | Promise<Response>, handler: () => Response = source) {
    const app = Fastify();
    await apply(app, [enhance(() => fn, { name: "after", order: -100 })]);
    app.route({ method: ["GET", "HEAD"], url: "/events", handler: () => handler() });
    return head(app);
  }

  it("keeps the status and headers of a native Response returned unchanged", async () => {
    const res = await headWith((r) => r);

    expect(res?.status).toBe(201);
    expect(res?.headers.get("x-kept")).toBe("old");
    expect(await res?.text()).toBe("");
  });

  it("sends the status and headers of a replaced Response", async () => {
    const res = await headWith(() => new Response("replacement", { status: 202, headers: { "x-kept": "new" } }));

    expect(res?.status).toBe(202);
    expect(res?.headers.get("x-kept")).toBe("new");
    expect(await res?.text()).toBe("");
  });

  it("lets a response function read the body", async () => {
    const res = await headWith(async (r) => {
      r.headers.set("x-json", await r.clone().json());
      r.headers.set("x-size", String((await r.clone().text()).length));
      return r;
    });

    expect(res?.status).toBe(201);
    expect(res?.headers.get("x-json")).toBe("hello");
    expect(res?.headers.get("x-size")).toBe("7");
  });

  it("completes when an endless body is replaced by a finite one", async () => {
    const { state, response } = idleStream();
    const res = await headWith(
      () => new Response("replacement", { status: 202 }),
      () => response,
    );

    expect(res, "HEAD never completed").not.toBeNull();
    expect(res?.status).toBe(202);
    expect(state.cancelled, "the replaced body was leaked").toBe(true);
  });
});
