import { Readable } from "node:stream";
import { enhance, type UniversalMiddleware } from "@universal-middleware/core";
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

describe("apply()", () => {
  const refuses = enhance(() => new Response("unauthorized", { status: 401 }), { name: "refuses" });
  const late = enhance(
    () => (response: Response) => {
      response.headers.set("x-late", "yes");
      return response;
    },
    { name: "late", order: 300 },
  );

  it("after a middleware answers, runs only the ones with a positive order", async () => {
    const ran: string[] = [];
    const instance = Fastify();
    app = instance;
    await apply(instance, [refuses, enhance(() => void ran.push("sideEffect"), { name: "sideEffect" }), late]);
    instance.get("/", async () => "route");
    const url = await instance.listen({ port: 0, host: "127.0.0.1" });
    const res = await fetch(url);
    expect(res.status).toBe(401);
    expect(ran).toEqual([]);
    expect(res.headers.get("x-late")).toBe("yes");
  });
});
