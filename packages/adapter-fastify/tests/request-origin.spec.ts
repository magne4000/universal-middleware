import type { UniversalHandler, UniversalMiddleware } from "@universal-middleware/core";
import Fastify, { type FastifyInstance, type FastifyServerOptions } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { apply, createHandler } from "../src/index.js";

// The request URL a universal handler gets has the origin Fastify's own routes see.

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

const echoesOrigin: UniversalHandler = (request) => new Response(new URL(request.url).origin);

async function start(setup: (app: FastifyInstance) => void, options: FastifyServerOptions = {}): Promise<string> {
  const instance = Fastify(options);
  setup(instance);
  app = instance;
  return instance.listen({ port: 0, host: "127.0.0.1" });
}

describe("request URL", () => {
  it.each([
    ["trusts the proxy", { trustProxy: true }],
    ["doesn't trust the proxy", {}],
  ])("has the protocol and host of Fastify's request when trustProxy %s", async (_, options) => {
    const url = await start((app) => {
      app.get("/fastify", (request) => `${request.protocol}://${request.host}`);
      app.get("/universal", createHandler(() => echoesOrigin)());
    }, options);
    const headers = { "x-forwarded-proto": "https", "x-forwarded-host": "public.example, internal-lb" };
    const fastify = await (await fetch(`${url}/fastify`, { headers })).text();
    const universal = await (await fetch(`${url}/universal`, { headers })).text();
    expect(universal).toBe(fastify);
  });

  it("has the origin option's origin", async () => {
    const url = await start((app) => {
      app.get("/", createHandler(() => echoesOrigin, { origin: "https://example.com" })());
    });
    expect(await (await fetch(url)).text()).toBe("https://example.com");
  });

  it("has the origin passed to apply, in every middleware and handler", async () => {
    const seen: string[] = [];
    const recordsOrigin: UniversalMiddleware = (request) => {
      seen.push(new URL(request.url).origin);
    };
    const instance = Fastify();
    await apply(instance, [recordsOrigin, echoesOrigin], { origin: "https://example.com" });
    app = instance;
    const url = await instance.listen({ port: 0, host: "127.0.0.1" });
    expect(await (await fetch(`${url}/p`)).text()).toBe("https://example.com");
    expect(seen).toEqual(["https://example.com"]);
  });
});
