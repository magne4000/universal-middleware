import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { Readable } from "node:stream";
import { type EnhancedMiddleware, enhance } from "@universal-middleware/core";
import { defineHandler, H3, type H3Event, HTTPError, toNodeHandler } from "h3";
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

const replace = enhance(() => (response: Response) => new Response("replaced", response), { name: "replace" });

function appWith(middleware: EnhancedMiddleware | undefined, route: (event: H3Event) => unknown, app = new H3()) {
  if (middleware) apply(app, [middleware]);
  app.use("/route", defineHandler(route));
  return app;
}

// Over a Node server, as a client gets it: `app.fetch` returns srvx's lazy Response, which omits default headers
async function sendOverNode(app: H3) {
  const server = createServer(toNodeHandler(app));
  const { promise, resolve } = Promise.withResolvers<void>();
  server.listen(0, "127.0.0.1", resolve);
  await promise;
  try {
    const res = await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/route`);
    return { res, body: await res.text() };
  } finally {
    server.closeAllConnections();
    server.close();
  }
}

async function send(route: (event: H3Event) => unknown, withStep: boolean) {
  const { res, body } = await sendOverNode(appWith(withStep ? step : undefined, route));
  return {
    status: res.status,
    // srvx writes its own `text/plain; charset=UTF-8`, a Response built from a string gets `text/plain;charset=UTF-8`
    type: res.headers.get("content-type")?.replace("; ", ";") ?? null,
    step: res.headers.get("x-step"),
    event: res.headers.get("x-event"),
    body,
  };
}

async function expectLikeH3(route: (event: H3Event) => unknown, expected: object) {
  const plain = await send(route, false);
  const wrapped = await send(route, true);
  expect(plain).toMatchObject(expected);
  expect(wrapped).toEqual({ ...plain, step: "yes" });
}

const json = "application/json;charset=UTF-8";

describe("response function and a route returning a value h3 converts", () => {
  it("object as JSON", () => expectLikeH3(() => ({ a: 1 }), { status: 200, type: json, body: '{"a":1}' }));
  it("array as JSON", () => expectLikeH3(() => [1, 2], { status: 200, type: json, body: "[1,2]" }));
  it("number, boolean and bigint as JSON", async () => {
    await expectLikeH3(() => 42, { status: 200, type: json, body: "42" });
    await expectLikeH3(() => false, { status: 200, type: json, body: "false" });
    await expectLikeH3(() => 5n, { status: 200, type: json, body: "5" });
  });
  it("string as text", () =>
    expectLikeH3(() => "<p>hi</p>", { status: 200, type: "text/plain;charset=UTF-8", body: "<p>hi</p>" }));
  it("null as an empty body", () => expectLikeH3(() => null, { status: 200, body: "" }));
  it("Buffer without content type", () =>
    expectLikeH3(() => Buffer.from("raw"), { status: 200, type: null, body: "raw" }));
  it("Node stream", () =>
    expectLikeH3(() => Readable.from([Buffer.from("a"), Buffer.from("b")]), { status: 200, type: null, body: "ab" }));
  it("Node stream of strings, read by a response function", async () => {
    const { body } = await sendOverNode(appWith(shout, () => Readable.from(["a", "b"])));
    expect(body).toBe("AB");
  });
  it.each([204, 304])("status %s with an object keeps the status and sends no body", (status) =>
    expectLikeH3(
      (event) => {
        event.res.status = status;
        return { a: 1 };
      },
      { status, body: "" },
    ),
  );
  it("keeps the status and headers set on the event", () =>
    expectLikeH3(
      (event) => {
        event.res.status = 201;
        event.res.headers.set("x-event", "set");
        event.res.headers.set("content-type", "application/vnd.api+json");
        return { a: 1 };
      },
      { status: 201, type: "application/vnd.api+json", event: "set", body: '{"a":1}' },
    ));
  it("h3 error", async () =>
    expect((await send(() => new HTTPError({ status: 418, statusText: "Teapot" }), true)).status).toBe(418));
  it("goes through the app's onError, and its onResponse once", async () => {
    const responses: Response[] = [];
    const app = new H3({
      onError: () => new Response("handled", { status: 418 }),
      onResponse: (response) => void responses.push(response),
    });
    const res = await appWith(step, () => new HTTPError({ status: 500 }), app).fetch(
      new Request("http://localhost/route"),
    );

    expect(res.status).toBe(418);
    expect(res.headers.get("x-step")).toBe("yes");
    expect(await res.text()).toBe("handled");
    expect(responses).toHaveLength(1);
  });
});

describe("response function returning a new Response", () => {
  const sendWeb = (middleware: EnhancedMiddleware) =>
    appWith(middleware, () => "<p>hi</p>").fetch(new Request("http://localhost/route"));

  it("sends the new Response when the old body was read", async () =>
    expect(await (await sendWeb(shout)).text()).toBe("<P>HI</P>"));
  it("sends the new Response when the old body was never read", async () =>
    expect(await (await sendWeb(replace)).text()).toBe("replaced"));
  it("sends it once on a Node server", async () => {
    const errors: unknown[] = [];
    const app = new H3({ onError: (error) => void errors.push(error) });
    const { body } = await sendOverNode(appWith(shout, () => "<p>hi</p>", app));
    expect(body).toBe("<P>HI</P>");
    expect(errors).toEqual([]);
  });
});
