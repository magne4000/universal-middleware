import { enhance, type UniversalMiddleware } from "@universal-middleware/core";
import { type AnyElysia, Elysia, t } from "elysia";
import { describe, expect, it } from "vitest";
import { apply, createMiddleware } from "../src/index.js";

// A response function gets, and sends, what Elysia would send for the route's value. A route that returned anything but
// a Response answered 500.

const marks: UniversalMiddleware = () => (response: Response) => {
  response.headers.set("x-marked", "yes");
  return response;
};

type App = { handle: (request: Request) => Promise<Response> };

const routes = (app: AnyElysia) =>
  app
    .get("/text", () => "hello")
    .get("/json", () => ({ ok: true }))
    .get("/response", () => new Response("hello"))
    .get("/status", ({ status }) => status(201, "created"))
    .get("/set", ({ set }) => {
      set.status = 202;
      set.headers["x-route"] = "kept";
      return "with set";
    })
    .get("/cookie", ({ cookie: { session } }) => {
      session.value = "abc";
      return "cookie";
    })
    .get("/nothing", () => {});

async function answer(app: App, path: string) {
  const res = await app.handle(new Request(`http://localhost${path}`));
  const { "x-marked": marked, ...headers } = Object.fromEntries(res.headers);
  return { status: res.status, headers, setCookie: res.headers.getSetCookie(), body: await res.text(), marked };
}

describe.each([true, false])("aot: %s", (aot) => {
  it.each(["/text", "/json", "/response", "/status", "/set", "/cookie", "/nothing"])(
    "%s answers as without the response function, which ran",
    async (path) => {
      const plain = await answer(routes(new Elysia({ aot })), path);
      const marked = await answer(routes(new Elysia({ aot }).use(createMiddleware(() => marks)())), path);
      expect(marked).toEqual({ ...plain, marked: "yes" });
    },
  );

  it("runs the response function registered by apply()", async () => {
    const app = new Elysia({ aot });
    apply(app, [enhance(marks, { name: "marks" })]);
    app.get("/text", () => "hello");
    expect(await answer(app, "/text")).toMatchObject({ status: 200, body: "hello", marked: "yes" });
  });

  it("hands the response function the status and headers the route set, and sends what it changed", async () => {
    let seen: { status: number; route: string | null } | undefined;
    const rewrites: UniversalMiddleware = () => (response: Response) => {
      seen = { status: response.status, route: response.headers.get("x-route") };
      const headers = new Headers(response.headers);
      headers.delete("x-route");
      return new Response("rewritten", { status: 200, headers });
    };
    const app = routes(new Elysia({ aot }).use(createMiddleware(() => rewrites)()));
    const res = await answer(app, "/set");
    expect(seen).toEqual({ status: 202, route: "kept" });
    expect(res).toMatchObject({ status: 200, body: "rewritten" });
    expect(res.headers["x-route"]).toBeUndefined();
  });

  it("validates the route's value against its response schema when no response function is pending", async () => {
    const app = new Elysia({ aot })
      .use(createMiddleware(() => () => {})())
      .get("/", () => ({ id: 1, password: "secret" }), { response: t.Object({ id: t.Number() }) });
    expect((await answer(app, "/")).body).toBe('{"id":1}');
  });
});

describe("aot: true", () => {
  it("hands the response function the value cleaned by the route's response schema", async () => {
    let seen: string | undefined;
    const reads: UniversalMiddleware = () => async (response: Response) => {
      seen = await response.clone().text();
      return response;
    };
    const app = new Elysia()
      .use(createMiddleware(() => reads)())
      .get("/", () => ({ id: 1, password: "secret" }), { response: t.Object({ id: t.Number() }) });
    expect((await answer(app, "/")).body).toBe('{"id":1}');
    expect(seen).toBe('{"id":1}');
  });

  it("sends a signed cookie once, signed", async () => {
    const routesWithSignedCookie = (app: AnyElysia) =>
      app.get("/", async ({ cookie: { session } }) => {
        session.value = "abc";
        return "signed";
      });
    const cookie = { secrets: "s3cret", sign: ["session"] };
    const plain = await answer(routesWithSignedCookie(new Elysia({ cookie })), "/");
    const marked = await answer(
      routesWithSignedCookie(new Elysia({ cookie }).use(createMiddleware(() => marks)())),
      "/",
    );
    expect(plain.setCookie).toEqual([expect.stringMatching(/^session=abc\.[^;]+; Path=\/$/)]);
    expect(marked).toEqual({ ...plain, marked: "yes" });
  });
});
