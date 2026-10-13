import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { describe, expect, test } from "vitest";
import { enhance, type RuntimeAdapter, withMutableHeaders } from "../src/index";
import { pipe } from "../src/pipe";

// `Response.redirect()` and `fetch()` give a Response with immutable headers: a response function that changes them
// threw `TypeError: immutable`.

const request = new Request("http://localhost/");
const runtime: RuntimeAdapter = { runtime: "other", adapter: "other", params: undefined };

const immutableResponses: [string, () => Promise<Response>][] = [
  ["Response.redirect()", async () => Response.redirect("http://localhost/target", 302)],
  ["a fetch() response", () => fetch("data:text/plain,fetched")],
];

const changesHeaders = () => (response: Response) => {
  response.headers.set("x-changed", "yes");
  response.headers.set("location", "/changed");
  response.headers.append("set-cookie", "changed=1");
  return response;
};

async function received(response: Response) {
  return {
    status: response.status,
    body: await response.text(),
    changed: response.headers.get("x-changed"),
    location: response.headers.get("location"),
    cookies: response.headers.getSetCookie(),
  };
}

const expected = {
  "Response.redirect()": { status: 302, body: "" },
  "a fetch() response": { status: 200, body: "fetched" },
};

describe("withMutableHeaders", () => {
  test("returns a Response with mutable headers as is", () => {
    const response = new Response("ok");
    expect(withMutableHeaders(response)).toBe(response);
  });

  test("copies a fetch() response with its status, status text, cookies, streamed body, url and type", async () => {
    const server = createServer((req, res) => {
      if (req.url === "/start") {
        res.writeHead(302, { location: "/final" }).end();
        return;
      }
      res.writeHead(201, "Made", [
        ["set-cookie", "a=1"],
        ["set-cookie", "b=2"],
        ["x-kept", "yes"],
      ]);
      res.write("first ");
      res.end("second");
    });
    const { promise, resolve } = Promise.withResolvers<void>();
    server.listen(0, "127.0.0.1", resolve);
    await promise;
    try {
      const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
      const fetched = await fetch(`${origin}/start`);
      expect(() => fetched.headers.set("x-changed", "yes")).toThrow(TypeError);

      const copy = withMutableHeaders(fetched);
      copy.headers.set("x-changed", "yes");

      expect(copy.status).toBe(201);
      expect(copy.statusText).toBe("Made");
      expect(copy.headers.getSetCookie()).toEqual(["a=1", "b=2"]);
      expect(copy.headers.get("x-kept")).toBe("yes");
      expect(await copy.text()).toBe("first second");
      expect({ url: copy.url, redirected: copy.redirected, type: copy.type }).toEqual({
        url: `${origin}/final`,
        redirected: true,
        type: "basic",
      });
    } finally {
      server.closeAllConnections();
      server.close();
    }
  });
});

describe.each(immutableResponses)("pipe(), a handler returning %s", (name, immutable) => {
  const want = {
    ...expected[name as keyof typeof expected],
    changed: "yes",
    location: "/changed",
    cookies: ["changed=1"],
  };

  test("a response function changes its headers", async () => {
    const handler = pipe(changesHeaders, immutable);
    expect(await received(await handler(request, {}, runtime))).toEqual(want);
  });

  test("an after-response middleware's response function changes its headers", async () => {
    const handler = pipe(immutable, enhance(changesHeaders, { order: 1 }));
    // The handler answers, so the pipe returns a Response
    expect(await received((await handler(request, {}, runtime)) as Response)).toEqual(want);
  });

  test("a middleware answering with it, then an `always` one's response function", async () => {
    const handler = pipe(
      () => immutable(),
      enhance(changesHeaders, { runs: "always" }),
      () => new Response("unreachable"),
    );
    expect(await received(await handler(request, {}, runtime))).toEqual(want);
  });

  test("a response function replaces the Response with it, the next one changes its headers", async () => {
    const handler = pipe(
      () => () => immutable(),
      changesHeaders,
      () => new Response("replaced"),
    );
    expect(await received(await handler(request, {}, runtime))).toEqual(want);
  });
});

test("pipe(): a response function reads the url of a fetch() response", async () => {
  const recordsSource = () => (response: Response) =>
    new Response(response.body, { headers: { "x-source": response.url } });
  const handler = pipe(recordsSource, () => fetch("data:text/plain,fetched"));
  expect((await handler(request, {}, runtime)).headers.get("x-source")).toBe("data:text/plain,fetched");
});
