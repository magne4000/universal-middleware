import { Readable } from "node:stream";
import { enhance, type UniversalMiddleware } from "@universal-middleware/core";
import Fastify, { type FastifyInstance, type FastifyReply } from "fastify";
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

describe("the headers a route set, under a response function", () => {
  // Adds a cookie and a header, and deletes the route's `x-deleted`
  const changes: UniversalMiddleware = () => (response: Response) => {
    response.headers.append("set-cookie", "changed=1");
    response.headers.set("x-changed", "yes");
    response.headers.delete("x-deleted");
    return response;
  };

  async function startWith(
    responseFunction: UniversalMiddleware,
    setup: (app: FastifyInstance) => void,
    registration = "createMiddleware()",
  ) {
    const instance = Fastify();
    if (registration === "apply()") await apply(instance, [enhance(responseFunction, { name: "changes" })]);
    else await instance.register(createMiddleware(() => responseFunction)());
    setup(instance);
    app = instance;
    return instance.listen({ port: 0, host: "127.0.0.1" });
  }

  const payloads: [string, (reply: FastifyReply) => unknown][] = [
    ["a string", () => "text"],
    ["an object", () => ({ a: 1 })],
    ["a Buffer", () => Buffer.from("bytes")],
    ["a Node stream", () => Readable.from(["node"])],
    [
      "a web stream",
      () =>
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode("web"));
            controller.close();
          },
        }),
    ],
    ["a Response", () => new Response("response")],
    ["a Response with immutable headers", () => Response.redirect("http://127.0.0.1/elsewhere", 302)],
    ["nothing, with status 204", (reply) => reply.code(204).send()],
  ];

  describe.each(["createMiddleware()", "apply()"])("registered with %s", (registration) => {
    describe.each(payloads)("%s", (_, payload) => {
      it.each(["GET", "HEAD", "POST"])("%s: each cookie once, and the header changes", async (method) => {
        const url = await startWith(
          changes,
          (app) =>
            app.route({
              method: ["GET", "HEAD", "POST"],
              url: "/",
              handler: (_request, reply) => {
                reply.header("set-cookie", "own=1");
                reply.header("x-deleted", "yes");
                return payload(reply);
              },
            }),
          registration,
        );

        const res = await fetch(url, { method, redirect: "manual" });
        expect(res.headers.getSetCookie()).toEqual(["own=1", "changed=1"]);
        expect(res.headers.get("x-changed")).toBe("yes");
        expect(res.headers.has("x-deleted")).toBe(false);
      });
    });
  });

  it("sends a cookie an onRequest hook set once", async () => {
    const url = await startWith(changes, (app) => {
      app.addHook("onRequest", async (_request, reply) => {
        reply.header("set-cookie", "hook=1");
      });
      app.get("/", () => "text");
    });

    expect((await fetch(url)).headers.getSetCookie()).toEqual(["hook=1", "changed=1"]);
  });

  it("keeps the reply's headers when an onSend hook after it throws", async () => {
    const url = await startWith(changes, (app) => {
      app.addHook("onRequest", async (_request, reply) => {
        reply.header("access-control-allow-origin", "*");
      });
      app.addHook("onSend", async () => {
        throw new Error("later hook");
      });
      app.get("/", (_request, reply) => {
        reply.header("set-cookie", "own=1");
        return "text";
      });
    });

    const res = await fetch(url);
    expect(res.status).toBe(500);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    expect(res.headers.getSetCookie()).toEqual(["own=1", "changed=1"]);
  });

  it("sends none of the route's headers once a response function replaced the Response", async () => {
    const replaces: UniversalMiddleware = () => () => new Response("replaced", { headers: { "set-cookie": "new=1" } });
    const url = await startWith(replaces, (app) =>
      app.get("/", (_request, reply) => {
        reply.header("set-cookie", "own=1");
        reply.header("x-deleted", "yes");
        return "text";
      }),
    );

    const res = await fetch(url);
    expect(res.headers.getSetCookie()).toEqual(["new=1"]);
    expect(res.headers.has("x-deleted")).toBe(false);
    expect(await res.text()).toBe("replaced");
  });
});
