import { Readable } from "node:stream";
import type { UniversalMiddleware } from "@universal-middleware/core";
import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { createHandler, createMiddleware } from "../src/index.js";

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
