import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createServer } from "@hattip/adapter-node";
import { createRouter, type Router } from "@hattip/router";
import { enhance } from "@universal-middleware/core";
import { endlessResponse } from "@universal-middleware/tests/utils";
import { afterEach, describe, expect, it } from "vitest";
import { apply, createHandler } from "../src/index.js";

// A HEAD response has no body: on Node, an endless body (SSE, a proxied stream) must be cancelled, not piped.

const servers: Server[] = [];

afterEach(() => {
  for (const server of servers.splice(0)) {
    server.closeAllConnections();
    server.close();
  }
});

async function head(app: Router) {
  const server = createServer(app.buildHandler());
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const ctrl = new AbortController();
  try {
    // A HEAD that never completes (its body stream still awaited) fails the test by timeout
    const res = await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/events`, {
      method: "HEAD",
      signal: ctrl.signal,
    });
    // Node 22 fails a body read after the abort below, so read it first.
    return new Response(await res.arrayBuffer(), res);
  } finally {
    ctrl.abort();
  }
}

describe("HEAD with an endless body", () => {
  it("completes and cancels the body of a middleware without path", async () => {
    const { state, response } = endlessResponse();
    const app = createRouter();
    apply(app, [enhance(() => response, { name: "sse", order: -100 })]);

    const res = await head(app);

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/event-stream");
    expect(res.headers.get("x-kept")).toBe("yes");
    expect(state.cancelled).toBe(true);
  });

  it("completes and cancels the body of a handler", async () => {
    const { state, response } = endlessResponse();
    const app = createRouter();
    app.head("/events", createHandler(() => () => response)());

    const res = await head(app);

    expect(res.headers.get("x-kept")).toBe("yes");
    expect(state.cancelled).toBe(true);
  });

  it("completes and cancels the body when a response function runs over a native handler", async () => {
    const { state, response } = endlessResponse();
    const app = createRouter();
    apply(app, [enhance(() => (res: Response) => res, { name: "after", order: -100 })]);
    app.use("/events", () => response);

    const res = await head(app);

    expect(res.headers.get("x-kept")).toBe("yes");
    expect(state.cancelled).toBe(true);
  });

  it.each([
    ["route", {}],
    ["path-scoped middleware", { order: -100 }],
  ])("answers HEAD from a GET-only %s and cancels the body", async (_, options) => {
    const { state, response } = endlessResponse();
    const app = createRouter();
    apply(app, [enhance(() => response, { method: "GET", path: "/events", ...options })]);

    const res = await head(app);

    expect(res.status).toBe(200);
    expect(state.cancelled).toBe(true);
  });
});

describe("HEAD with a response function", () => {
  const source = () => new Response('"hello"', { status: 201, headers: { "x-kept": "old" } });

  async function headWith(fn: (res: Response) => Response | Promise<Response>, handler: () => Response = source) {
    const app = createRouter();
    apply(app, [enhance(() => fn, { name: "after", order: -100 })]);
    app.use("/events", () => handler());
    return head(app);
  }

  async function headWithUniversal(fn: (res: Response) => Response | Promise<Response>) {
    const app = createRouter();
    apply(app, [enhance(() => fn, { name: "after", order: -100 })]);
    app.head("/events", createHandler(() => source)());
    return head(app);
  }

  it("keeps the status and headers of a native Response returned unchanged", async () => {
    const res = await headWith((r) => r);

    expect(res.status).toBe(201);
    expect(res.headers.get("x-kept")).toBe("old");
    expect(await res.text()).toBe("");
  });

  it("sends the status and headers of a replaced Response", async () => {
    const res = await headWith(() => new Response("replacement", { status: 202, headers: { "x-kept": "new" } }));

    expect(res.status).toBe(202);
    expect(res.headers.get("x-kept")).toBe("new");
    expect(await res.text()).toBe("");
  });

  it("lets a response function read the body", async () => {
    const res = await headWithUniversal(async (r) => {
      r.headers.set("x-json", await r.clone().json());
      r.headers.set("x-size", String((await r.clone().text()).length));
      return r;
    });

    expect(res.status).toBe(201);
    expect(res.headers.get("x-json")).toBe("hello");
    expect(res.headers.get("x-size")).toBe("7");
  });

  it("sends the content-length of the response", async () => {
    const declared = () => new Response("hello", { headers: { "content-length": "5" } });

    expect((await headWith((r) => r, declared)).headers.get("content-length")).toBe("5");
    expect((await headWith((r) => r)).headers.get("content-length")).toBeNull();
  });

  it("completes when an endless body is replaced by a finite one", async () => {
    const { state, response } = endlessResponse();
    const res = await headWith(
      () => new Response("replacement", { status: 202 }),
      () => response,
    );

    expect(res.status).toBe(202);
    expect(state.cancelled, "the replaced body was leaked").toBe(true);
  });
});
