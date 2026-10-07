import { describe, expect, test } from "vitest";
import { enhance, params, pipeRoute, type RuntimeAdapter } from "../src/index";

describe("pipeRoute matches the decoded pathname", () => {
  const route = (path: string) =>
    enhance((_request, _ctx, runtime) => new Response(JSON.stringify(runtime.params ?? {}), { status: 200 }), {
      name: path,
      path,
      method: "GET",
    });
  const routerFor = (paths: string[]) => {
    const router = pipeRoute(paths.map(route));
    return async (path: string) => {
      const runtime: RuntimeAdapter = { runtime: "other", adapter: "other", params: undefined };
      return (await router(new Request(`http://localhost${path}`), {}, runtime)) as Response | undefined;
    };
  };
  const run = routerFor([
    "/dash",
    "/café",
    "/a/b",
    "/users/:id",
    "/hello%20world",
    "/menu/caf%C3%A9",
    "/guard/**",
    "/a^b",
    "/wiki/Foo_%28bar%29",
    "/star%2Aend",
  ]);

  test("an encoded character matches the route it decodes to", async () => {
    expect((await run("/%64ash"))?.status).toBe(200);
    expect((await run("/%64%61%73%68"))?.status).toBe(200);
  });

  test("percent-encoded UTF-8 matches in upper and lower case", async () => {
    expect((await run("/caf%C3%A9"))?.status).toBe(200);
    expect((await run("/caf%c3%a9"))?.status).toBe(200);
  });

  test("a character the URL parser keeps raw but a route pattern encodes still matches", async () => {
    expect((await run("/a^b"))?.status).toBe(200);
    expect((await run("/a%5Eb"))?.status).toBe(200);
  });

  test("an encoded character in a route pattern is a literal character, not pattern syntax", async () => {
    expect((await run("/wiki/Foo_(bar)"))?.status).toBe(200);
    expect((await run("/wiki/Foo_%28bar%29"))?.status).toBe(200);
    expect(await run("/wiki/Foo_bar")).toBeUndefined();
    expect((await run("/star*end"))?.status).toBe(200);
    expect(await run("/starXend")).toBeUndefined();
    expect(await run("/star/a/b/end")).toBeUndefined();
  });

  test("an encoded control character in a route pattern stays encoded", async () => {
    const runTab = routerFor(["/tab%09x"]);
    expect((await runTab("/tab%09x"))?.status).toBe(200);
  });

  test("an encoded slash stays encoded and does not match a path with a slash", async () => {
    expect(await run("/a%2Fb")).toBeUndefined();
    expect((await run("/a/b"))?.status).toBe(200);
  });

  test("an encoded percent sign is not decoded twice", async () => {
    expect(await run("/%2564ash")).toBeUndefined();
  });

  test("a malformed encoding does not throw and matches nothing", async () => {
    expect(await run("/%zz")).toBeUndefined();
    expect(await run("/dash%")).toBeUndefined();
  });

  test("a malformed encoding only keeps the escape run that fails to decode", async () => {
    expect((await run("/%67uard/%zz"))?.status).toBe(200);
    expect((await run("/%67uard/%E2%82"))?.status).toBe(200);
  });

  test("a route declared with an encoded path matches its encoded and decoded forms", async () => {
    for (const path of ["/hello%20world", "/hello world", "/menu/caf%C3%A9", "/menu/café"]) {
      expect((await run(path))?.status).toBe(200);
    }
  });

  test("a parameter is decoded with decodeURIComponent, once", async () => {
    expect(await (await run("/users/a%20b"))?.json()).toEqual({ id: "a b" });
    expect(await (await run("/users/a%2Fb"))?.json()).toEqual({ id: "a/b" });
    expect(await (await run("/users/a%3Fb"))?.json()).toEqual({ id: "a?b" });
    expect(await (await run("/users/a%2520b"))?.json()).toEqual({ id: "a%20b" });
  });
});

describe("params() decodes like the router", () => {
  const runtime: RuntimeAdapter = { runtime: "other", adapter: "other", params: undefined };
  test.each([
    ["/users/a%20b", "a b"],
    ["/users/a%2Fb", "a/b"],
    ["/users/a%2520b", "a%20b"],
    ["/users/%zz", "%zz"],
  ])("%s", (path, id) => {
    expect(params(new Request(`http://localhost${path}`), runtime, "/users/:id")).toEqual({ id });
  });
  test.each([
    ["/caf%C3%A9/1", "/caf%C3%A9/:id"],
    ["/caf%C3%A9/1", "/café/:id"],
    ["/hello%20world/1", "/hello%20world/:id"],
  ])("%s with the pattern %s", (path, pattern) => {
    expect(params(new Request(`http://localhost${path}`), runtime, pattern)).toEqual({ id: "1" });
  });
});

describe("a middleware with a path and an order runs only for that path", () => {
  const page = enhance(() => new Response("page"), { name: "page", path: "/**", method: ["GET", "HEAD"] });
  const auth = enhance(
    (request: Request) => (request.headers.has("x-auth") ? undefined : new Response("Unauthorized", { status: 401 })),
    { name: "auth", path: "/admin/**", order: -800 },
  );
  const header = enhance(
    () => (response: Response) => {
      response.headers.set("x-settings", "yes");
      return response;
    },
    { name: "header", path: "/admin/settings", method: "GET", order: 200 },
  );
  const router = pipeRoute([page, auth, header]);
  const run = async (path: string, init?: RequestInit) => {
    const runtime: RuntimeAdapter = { runtime: "other", adapter: "other", params: undefined };
    return (await router(new Request(`http://localhost${path}`, init), {}, runtime)) as Response;
  };

  test("runs for a matching path", async () => {
    expect((await run("/admin/settings")).status).toBe(401);
  });

  test("is skipped for any other path", async () => {
    const response = await run("/about");
    expect(await response.text()).toBe("page");
    expect(response.headers.get("x-settings")).toBe(null);
  });

  test("every matching middleware runs, then the handler", async () => {
    const response = await run("/admin/settings", { headers: { "x-auth": "1" } });
    expect(await response.text()).toBe("page");
    expect(response.headers.get("x-settings")).toBe("yes");
  });

  test("matches the decoded path, like a route", async () => {
    expect((await run("/%61dmin/settings")).status).toBe(401);
  });

  test("respects its method", async () => {
    const response = await run("/admin/settings", { method: "HEAD", headers: { "x-auth": "1" } });
    expect(response.headers.get("x-settings")).toBe(null);
  });
});
