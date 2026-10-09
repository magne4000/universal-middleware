import { Readable } from "node:stream";
import { enhance } from "@universal-middleware/core";
import { createApp, createError, eventHandler, setResponseHeader, setResponseStatus, toWebHandler } from "h3";
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

async function send(route: () => unknown, withStep: boolean) {
  const app = createApp();
  if (withStep) apply(app, [step]);
  app.use("/route", eventHandler(route as () => never));
  const res = await toWebHandler(app)(new Request("http://localhost/route"));
  return {
    status: res.status,
    type: res.headers.get("content-type"),
    step: res.headers.get("x-step"),
    body: await res.text(),
  };
}

async function expectLikeH3(route: () => unknown, expected: { status: number; type: string | null; body: string }) {
  const plain = await send(route, false);
  const wrapped = await send(route, true);
  expect(plain).toMatchObject(expected);
  expect(wrapped).toEqual({ ...plain, step: "yes" });
}

describe("response function and a route returning a value h3 converts", () => {
  it("object as JSON", () =>
    expectLikeH3(() => ({ a: 1 }), { status: 200, type: "application/json", body: '{"a":1}' }));
  it("array as JSON", () => expectLikeH3(() => [1, 2], { status: 200, type: "application/json", body: "[1,2]" }));
  it("number and boolean as JSON", async () => {
    await expectLikeH3(() => 42, { status: 200, type: "application/json", body: "42" });
    await expectLikeH3(() => false, { status: 200, type: "application/json", body: "false" });
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
  it("object with arrayBuffer() and a type", () =>
    expectLikeH3(() => ({ type: "text/plain", arrayBuffer: async () => new TextEncoder().encode("blob").buffer }), {
      status: 200,
      type: "text/plain",
      body: "blob",
    }));
  it("keeps the status and headers set on the event", async () => {
    const route = () => ({ a: 1 });
    const app = createApp();
    apply(app, [step]);
    app.use(
      "/route",
      eventHandler((event) => {
        setResponseStatus(event, 201);
        setResponseHeader(event, "x-event", "set");
        setResponseHeader(event, "content-type", "application/vnd.api+json");
        return route();
      }),
    );
    const res = await toWebHandler(app)(new Request("http://localhost/route"));
    expect(res.status).toBe(201);
    expect(res.headers.get("x-event")).toBe("set");
    expect(res.headers.get("content-type")).toBe("application/vnd.api+json");
    expect(res.headers.get("x-step")).toBe("yes");
    expect(await res.json()).toEqual({ a: 1 });
  });
  it("h3 error", async () => {
    const route = () => createError({ statusCode: 418, statusMessage: "Teapot" });
    const app = createApp();
    apply(app, [step]);
    app.use("/route", eventHandler(route as () => never));
    const res = await toWebHandler(app)(new Request("http://localhost/route"));
    expect(res.status).toBe(418);
  });
  it("a value h3 cannot send is a 500", async () => {
    const plain = await send(() => Symbol("x"), false);
    const wrapped = await send(() => Symbol("x"), true);
    expect(plain.status).toBe(500);
    expect(wrapped.status).toBe(500);
  });
});
