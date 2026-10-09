import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { Readable } from "node:stream";
import { enhance } from "@universal-middleware/core";
import {
  createApp,
  createError,
  eventHandler,
  type H3Event,
  setResponseHeader,
  setResponseStatus,
  toNodeListener,
  toWebHandler,
} from "h3";
import { describe, expect, it } from "vitest";
import { apply } from "../src/index.js";

// A middleware returning a response function wraps what a route returns, and h3 itself converts a route's return
// value that isn't a Response: the response function must get what h3 would have sent, plus its own change.

const step = enhance(
  () => (response: Response) => {
    response.headers.set("x-step", "yes");
    return response;
  },
  { name: "step" },
);

const shout = enhance(
  () => async (response: Response) => new Response((await response.text()).toUpperCase(), response),
  {
    name: "shout",
  },
);

async function send(route: (event: H3Event) => unknown, withStep: boolean) {
  const app = createApp();
  if (withStep) apply(app, [step]);
  app.use("/route", eventHandler(route as (event: H3Event) => never));
  const res = await toWebHandler(app)(new Request("http://localhost/route"));
  return {
    status: res.status,
    type: res.headers.get("content-type"),
    step: res.headers.get("x-step"),
    event: res.headers.get("x-event"),
    body: await res.text(),
  };
}

async function expectLikeH3(route: (event: H3Event) => unknown, expected: object) {
  const plain = await send(route, false);
  const wrapped = await send(route, true);
  expect(plain).toMatchObject(expected);
  expect(wrapped).toEqual({ ...plain, step: "yes" });
}

describe("response function and a route returning a value h3 converts", () => {
  it("object as JSON", () =>
    expectLikeH3(() => ({ a: 1 }), { status: 200, type: "application/json", body: '{"a":1}' }));
  it("array as JSON", () => expectLikeH3(() => [1, 2], { status: 200, type: "application/json", body: "[1,2]" }));
  it("number, boolean and bigint as JSON", async () => {
    await expectLikeH3(() => 42, { status: 200, type: "application/json", body: "42" });
    await expectLikeH3(() => false, { status: 200, type: "application/json", body: "false" });
    await expectLikeH3(() => 5n, { status: 200, type: "application/json", body: "5" });
  });
  it("string as HTML", () => expectLikeH3(() => "<p>hi</p>", { status: 200, type: "text/html", body: "<p>hi</p>" }));
  it("null as 204", () => expectLikeH3(() => null, { status: 204, type: null, body: "" }));
  it("Buffer without content type", () =>
    expectLikeH3(() => Buffer.from("raw"), { status: 200, type: null, body: "raw" }));
  it("Node stream", () =>
    expectLikeH3(() => Readable.from([Buffer.from("a"), Buffer.from("b")]), { status: 200, type: null, body: "ab" }));
  it("Node stream where ReadableStream.from is missing (Bun)", async () => {
    const { from } = ReadableStream as unknown as { from: unknown };
    Object.defineProperty(ReadableStream, "from", { value: undefined, configurable: true });
    try {
      await expectLikeH3(() => Readable.from([Buffer.from("a"), Buffer.from("b")]), {
        status: 200,
        type: null,
        body: "ab",
      });
    } finally {
      Object.defineProperty(ReadableStream, "from", { value: from, configurable: true, writable: true });
    }
  });
  it("Node stream of strings, read by a response function", async () => {
    const app = createApp();
    apply(app, [shout]);
    app.use(
      "/route",
      eventHandler(() => Readable.from(["a", "b"])),
    );
    const server = createServer(toNodeListener(app));
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
      const res = await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/route`);
      expect(await res.text()).toBe("AB");
    } finally {
      server.closeAllConnections();
      server.close();
    }
  });
  it("HEAD releases the Node stream", async () => {
    const source = new Readable({
      read() {
        this.push("x");
      },
    });
    const app = createApp();
    apply(app, [step]);
    app.use(
      "/route",
      eventHandler(() => source),
    );
    await toWebHandler(app)(new Request("http://localhost/route", { method: "HEAD" }));
    await new Promise((resolve) => setImmediate(resolve));
    expect(source.destroyed).toBe(true);
  });
  it.each(["HEAD", "cancellation"])("%s releases a Node stream that is waiting for data", async (mode) => {
    const source = new Readable({ read() {} });
    const app = createApp();
    apply(app, [step]);
    app.use(
      "/route",
      eventHandler(() => source),
    );
    try {
      const res = await toWebHandler(app)(
        new Request("http://localhost/route", { method: mode === "HEAD" ? "HEAD" : "GET" }),
      );
      if (mode === "cancellation") void res.body?.cancel();
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(source.destroyed).toBe(true);
    } finally {
      source.destroy();
    }
  });
  it("object with arrayBuffer() and a type", () =>
    expectLikeH3(() => ({ type: "text/plain", arrayBuffer: async () => new TextEncoder().encode("blob").buffer }), {
      status: 200,
      type: "text/plain",
      body: "blob",
    }));
  it("keeps the status and headers set on the event", () =>
    expectLikeH3(
      (event) => {
        setResponseStatus(event, 201);
        setResponseHeader(event, "x-event", "set");
        setResponseHeader(event, "content-type", "application/vnd.api+json");
        return { a: 1 };
      },
      { status: 201, type: "application/vnd.api+json", event: "set", body: '{"a":1}' },
    ));
  it("h3 error", async () =>
    expect((await send(() => createError({ statusCode: 418, statusMessage: "Teapot" }), true)).status).toBe(418));
  it("a value h3 cannot send is a 500", async () => expect((await send(() => Symbol("x"), true)).status).toBe(500));
});
