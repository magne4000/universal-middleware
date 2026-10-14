import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { describe, expect, test } from "vitest";
import { enhance, type RuntimeAdapter, withMutableHeaders } from "../src/index";
import { pipe } from "../src/pipe";

// Except on Bun, `Response.redirect()` and `fetch()` give a Response with immutable headers: a response function
// that changes them threw a `TypeError`.

const request = new Request("http://localhost/");
const runtime: RuntimeAdapter = { runtime: "other", adapter: "other", params: undefined };

const immutableResponses = [
  {
    name: "Response.redirect()",
    response: async () => Response.redirect("http://localhost/target", 302),
    status: 302,
    body: "",
  },
  { name: "a fetch() response", response: () => fetch("data:text/plain,fetched"), status: 200, body: "fetched" },
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

describe("withMutableHeaders", () => {
  test("returns a Response with mutable headers as is", () => {
    const response = new Response("ok");
    expect(withMutableHeaders(response)).toBe(response);
  });

  test("keeps a fetch() response's status, status text, cookies, streamed body, url and type", async () => {
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
      // Runtimes differ: Bun's fetch() gives mutable headers and type "default", Deno's replaces "Made" with "Created"
      const fetched = await fetch(`${origin}/start`);
      const copy = withMutableHeaders(fetched);
      copy.headers.set("x-changed", "yes");

      expect(copy.status).toBe(201);
      expect(copy.statusText).toBe(fetched.statusText);
      expect(copy.headers.getSetCookie()).toEqual(["a=1", "b=2"]);
      expect(copy.headers.get("x-kept")).toBe("yes");
      expect(await copy.text()).toBe("first second");
      expect({ url: copy.url, redirected: copy.redirected, type: copy.type }).toEqual({
        url: `${origin}/final`,
        redirected: true,
        type: fetched.type,
      });
    } finally {
      server.closeAllConnections();
      server.close();
    }
  });
});

describe.each(immutableResponses)("pipe(), a handler returning $name", ({ response: immutable, status, body }) => {
  const want = { status, body, changed: "yes", location: "/changed", cookies: ["changed=1"] };

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

describe("pipe(), a Response passed on as before", () => {
  const probe = "x-universal-middleware-probe";
  const marks = () => (response: Response) => {
    response.headers.set("x-marked", "yes");
    return response;
  };

  test("keeps the handler's header named like the probe", async () => {
    const handler = pipe(marks, () => new Response("ok", { headers: { [probe]: "keep-me" } }));
    expect((await handler(request, {}, runtime)).headers.get(probe)).toBe("keep-me");
  });

  test("keeps the header named like the probe that an earlier response function set", async () => {
    const setsProbe = () => (response: Response) => {
      response.headers.set(probe, "set-earlier");
      return response;
    };
    const handler = pipe(setsProbe, marks, () => new Response("ok"));
    expect((await handler(request, {}, runtime)).headers.get(probe)).toBe("set-earlier");
  });

  test("a response function recovers from `Response.error()`", async () => {
    const recovers = () => (response: Response) =>
      response.type === "error" ? new Response("recovered", { status: 502 }) : response;
    const response = await pipe(recovers, () => Response.error())(request, {}, runtime);
    expect({ status: response.status, body: await response.text() }).toEqual({ status: 502, body: "recovered" });
  });
});

test("pipe(): a response function reads the url of a fetch() response", async () => {
  const recordsSource = () => (response: Response) =>
    new Response(response.body, { headers: { "x-source": response.url } });
  const handler = pipe(recordsSource, () => fetch("data:text/plain,fetched"));
  expect((await handler(request, {}, runtime)).headers.get("x-source")).toBe("data:text/plain,fetched");
});
