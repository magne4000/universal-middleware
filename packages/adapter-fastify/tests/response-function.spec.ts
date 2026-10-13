import { Readable } from "node:stream";
import type { UniversalMiddleware } from "@universal-middleware/core";
import { changedHeaders, changesHeaders, immutableResponses, received } from "@universal-middleware/tests/utils";
import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { apply, createHandler, createMiddleware } from "../src/index.js";

// A response function gets what the route sent as a Response: whatever the route sent it with.

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

const keepsResponse: UniversalMiddleware = () => (response: Response) => response;

async function start(setup: (app: FastifyInstance) => void, options = {}): Promise<string> {
  const instance = Fastify(options);
  await instance.register(createMiddleware(() => keepsResponse)());
  setup(instance);
  app = instance;
  return instance.listen({ port: 0, host: "127.0.0.1" });
}

describe("what a route sends, under a response function", () => {
  it("reaches the client when it is a Node stream", async () => {
    const url = await start((app) =>
      app.get("/", (_request, reply) => reply.type("text/plain").send(Readable.from(["node ", "stream"]))),
    );
    const res = await fetch(url);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("node stream");
  });

  it("gets the reply's headers when it is a Response with immutable headers", async () => {
    const url = await start((app) => {
      app.addHook("onRequest", async (_request, reply) => {
        reply.header("x-from-hook", "1");
      });
      app.get("/", createHandler(() => () => Response.redirect("http://127.0.0.1/elsewhere", 302))());
    });
    const res = await fetch(url, { redirect: "manual" });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("http://127.0.0.1/elsewhere");
    expect(res.headers.get("x-from-hook")).toBe("1");
  });

  it("keeps a Response whose status forbids a body", async () => {
    const url = await start((app) => app.get("/", createHandler(() => () => new Response(null, { status: 204 }))()));
    const res = await fetch(url);
    expect(res.status).toBe(204);
  });

  it("sends every value of a header set as a list", async () => {
    const url = await start((app) =>
      app.get("/", (_request, reply) => {
        reply.header("link", ["</a.js>; rel=preload", "</b.js>; rel=preload"]);
        return "linked";
      }),
    );
    const res = await fetch(url);
    expect(res.headers.get("link")).toBe("</a.js>; rel=preload, </b.js>; rel=preload");
  });
});

describe("the response functions of several middlewares", () => {
  const appends =
    (name: string): UniversalMiddleware =>
    () =>
    (response: Response) => {
      response.headers.append("x-order", name);
      return response;
    };

  it("run once each, in order, in every app and child instance", async () => {
    const apps = [Fastify(), Fastify()];
    for (const instance of apps) {
      await instance.register(createMiddleware(() => appends("a"))());
      await instance.register(createMiddleware(() => appends("b"))());
      await instance.register(async (child) => {
        await child.register(createMiddleware(() => appends("c"))());
        child.get("/child", async () => "child");
      });
      instance.get("/root", async () => "root");
    }
    try {
      for (const instance of apps) {
        const url = await instance.listen({ port: 0, host: "127.0.0.1" });
        expect((await fetch(`${url}/root`)).headers.get("x-order")).toBe("a, b");
        expect((await fetch(`${url}/child`)).headers.get("x-order")).toBe("a, b, c");
      }
    } finally {
      await Promise.all(apps.map((instance) => instance.close()));
    }
  });
});

describe.each(immutableResponses)("a route returning $name", ({ response: immutable, status, body }) => {
  const replacesWith = () => () => immutable();
  const registrations: [string, (app: FastifyInstance, middlewares: UniversalMiddleware[]) => Promise<unknown>][] = [
    ["apply()", (app, middlewares) => apply(app, middlewares)],
    [
      "createMiddleware()",
      async (app, middlewares) => {
        for (const m of middlewares) await app.register(createMiddleware(() => m)());
      },
    ],
  ];

  async function startWith(
    register: (app: FastifyInstance) => Promise<unknown>,
    route: (app: FastifyInstance) => void,
  ) {
    const instance = Fastify();
    await register(instance);
    route(instance);
    app = instance;
    return instance.listen({ port: 0, host: "127.0.0.1" });
  }

  describe.each(registrations)("registered with %s", (_, register) => {
    it.each(["GET", "HEAD", "POST"])("%s: a response function changes its headers", async (method) => {
      const url = await startWith(
        (app) => register(app, [changesHeaders]),
        (app) => app.route({ method: ["GET", "HEAD", "POST"], url: "/", handler: createHandler(() => immutable)() }),
      );

      const response = await fetch(url, { method, redirect: "manual" });
      expect(await received(response)).toEqual({ status, body: method === "HEAD" ? "" : body, ...changedHeaders });
    });

    it("a response function replaces the Response with it, the next one changes its headers", async () => {
      const url = await startWith(
        (app) => register(app, [replacesWith, changesHeaders]),
        (app) => app.get("/", () => "replaced"),
      );

      const response = await fetch(url, { redirect: "manual" });
      expect(await received(response)).toEqual({ status, body, ...changedHeaders });
    });
  });
});
