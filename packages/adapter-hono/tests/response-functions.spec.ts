import { enhance, type UniversalMiddleware } from "@universal-middleware/core";
import {
  changedHeaders,
  changesHeaders,
  endlessResponse,
  immutableResponses,
  received,
} from "@universal-middleware/tests/utils";
import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { apply, createHandler, createMiddleware } from "../src/index.js";

const step = (name: string) =>
  enhance(
    () => (response: Response) => {
      response.headers.append("x-order", name);
      return response;
    },
    { name },
  );

it("applies response functions in registration order", async () => {
  const app = new Hono();
  apply(app, [step("first"), step("second")]);
  app.get("/", createHandler(() => () => new Response("ok"))());

  const response = await app.fetch(new Request("http://localhost/"));
  expect(response.headers.get("x-order")).toBe("first, second");
});

const registrations: [string, (app: Hono, middlewares: UniversalMiddleware[]) => void][] = [
  ["apply()", (app, middlewares) => apply(app, middlewares)],
  [
    "createMiddleware()",
    (app, middlewares) => {
      for (const m of middlewares) app.use(createMiddleware(() => m)());
    },
  ],
];

const readsUrl = () => (response: Response) => new Response(response.body, { headers: { "x-source": response.url } });

it.each(registrations)("%s: a response function reads the url of a fetch() response", async (_, register) => {
  const app = new Hono();
  register(app, [readsUrl]);
  app.get("/", createHandler(() => () => fetch("data:text/plain,fetched"))());

  const response = await app.fetch(new Request("http://localhost/"));
  expect(response.headers.get("x-source")).toBe("data:text/plain,fetched");
});

it.each(registrations)(
  "%s: a response function reads the url of a fetch() response the previous one changed",
  async (_, register) => {
    const app = new Hono();
    register(app, [changesHeaders, readsUrl]);
    app.get("/", createHandler(() => () => fetch("data:text/plain,fetched"))());

    const response = await app.fetch(new Request("http://localhost/"));
    expect(response.headers.get("x-source")).toBe("data:text/plain,fetched");
  },
);

it.each(registrations)(
  "%s: a response function changes the headers after setting one with Hono's c.header()",
  async (_, register) => {
    const app = new Hono();
    register(app, [
      (_request, _context, runtime) => (response: Response) => {
        if (runtime.adapter === "hono") runtime.hono.header("x-native", "native");
        response.headers.set("x-universal", "universal");
        return response;
      },
    ]);
    app.get("/", createHandler(() => () => new Response("hello"))());

    const response = await app.fetch(new Request("http://localhost/"));
    expect(response.headers.get("x-native")).toBe("native");
    expect(response.headers.get("x-universal")).toBe("universal");
  },
);

it.each(registrations)(
  "%s: a response function that sets its replacement on Hono's c.res releases the replaced body",
  async (_, register) => {
    const { response: endless, cancelled } = endlessResponse();
    const app = new Hono();
    register(app, [
      (_request, _context, runtime) => () => {
        if (runtime.adapter !== "hono") return;
        runtime.hono.res = new Response("replacement");
        return runtime.hono.res;
      },
    ]);
    app.get("/", createHandler(() => () => endless)());

    const response = await app.fetch(new Request("http://localhost/"));
    expect(await response.text()).toBe("replacement");
    await cancelled;
  },
);

describe.each(immutableResponses)("a route returning $name", ({ response: immutable, status, body }) => {
  const replacesWith = () => () => immutable();

  describe.each(registrations)("registered with %s", (_, register) => {
    it.each(["GET", "HEAD", "POST"])("%s: a response function changes its headers", async (method) => {
      const app = new Hono();
      register(app, [changesHeaders]);
      app.all("/", createHandler(() => immutable)());

      const response = await app.fetch(new Request("http://localhost/", { method }));
      expect(await received(response)).toEqual({ status, body: method === "HEAD" ? "" : body, ...changedHeaders });
    });

    it("a response function replaces the Response with it, the next one changes its headers", async () => {
      const app = new Hono();
      register(app, [replacesWith, changesHeaders]);
      app.get("/", createHandler(() => () => new Response("replaced"))());

      const response = await app.fetch(new Request("http://localhost/"));
      expect(await received(response)).toEqual({ status, body, ...changedHeaders });
    });
  });
});
