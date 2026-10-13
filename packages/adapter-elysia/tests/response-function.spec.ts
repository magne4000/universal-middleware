import { enhance, type UniversalMiddleware } from "@universal-middleware/core";
import { type AnyElysia, Elysia, sse, t } from "elysia";
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

describe("a streaming route, under a response function", () => {
  const changes: UniversalMiddleware = () => (response: Response) => {
    response.headers.append("set-cookie", "changed=1");
    response.headers.set("x-changed", "yes");
    return response;
  };

  const stream = () =>
    new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("ab"));
        controller.close();
      },
    });

  const routes: [string, (app: AnyElysia) => AnyElysia, string][] = [
    [
      "a generator",
      (app) =>
        app.all("/", function* () {
          yield "a";
          yield "b";
        }),
      "ab",
    ],
    [
      "an async generator",
      (app) =>
        app.all("/", async function* () {
          yield "a";
          yield "b";
        }),
      "ab",
    ],
    ["a ReadableStream", (app) => app.all("/", stream), "ab"],
    [
      "sse()",
      (app) =>
        app.all("/", async function* () {
          yield sse("ab");
        }),
      "data: ab\n\n",
    ],
    [
      "a chunked Response",
      (app) => app.all("/", () => new Response(stream(), { headers: { "transfer-encoding": "chunked" } })),
      "ab",
    ],
  ];

  const registrations: [string, (app: AnyElysia) => AnyElysia][] = [
    ["createMiddleware()", (app) => app.use(createMiddleware(() => changes)())],
    [
      "apply()",
      (app) => {
        apply(app, [enhance(changes, { name: "changes" })]);
        return app;
      },
    ],
  ];

  // Off Bun, Elysia streams a generator's strings as they are, which `Response.text()` rejects
  async function read(response: Response) {
    let text = "";
    const reader = (response.body as ReadableStream<Uint8Array | string>).getReader();
    for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
      text += typeof chunk.value === "string" ? chunk.value : new TextDecoder().decode(chunk.value);
    }
    return text;
  }

  describe.each(registrations)("registered with %s", (_, register) => {
    describe.each(routes)("%s", (_, route, body) => {
      it.each(["GET", "POST"])("%s: sends the cookie and the header the response function added", async (method) => {
        const app = route(register(new Elysia()));

        const response = await app.handle(new Request("http://localhost/", { method }));
        expect(response.headers.getSetCookie()).toEqual(["changed=1"]);
        expect(response.headers.get("x-changed")).toBe("yes");
        expect(await read(response)).toBe(body);
      });
    });

    it("sends the cookie the route set with Elysia's `cookie`, and the response function's", async () => {
      const app = register(new Elysia()).get("/", async function* ({ cookie: { session } }) {
        session.value = "abc";
        yield "a";
      });

      const response = await app.handle(new Request("http://localhost/"));
      expect(response.headers.getSetCookie().sort()).toEqual(["changed=1", "session=abc; Path=/"]);
      expect(await read(response)).toBe("a");
    });

    it("still streams: the route yields its second chunk once the client read the first", async () => {
      const firstRead = Promise.withResolvers<void>();
      const app = register(new Elysia()).get("/", async function* () {
        yield "a";
        await firstRead.promise;
        yield "b";
      });

      const response = await app.handle(new Request("http://localhost/"));
      const reader = (response.body as ReadableStream<Uint8Array | string>).getReader();
      const decode = (value: Uint8Array | string | undefined) =>
        typeof value === "string" ? value : new TextDecoder().decode(value);
      expect(decode((await reader.read()).value)).toBe("a");
      firstRead.resolve();
      expect(decode((await reader.read()).value)).toBe("b");
      expect(response.headers.getSetCookie()).toEqual(["changed=1"]);
    });
  });
});
