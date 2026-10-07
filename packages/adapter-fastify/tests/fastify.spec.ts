import { type Run, runTests } from "@universal-middleware/tests";
import fastify from "fastify";
import * as vitest from "vitest";
import { apply } from "../src/index.js";

let port = 3400;

const runs: Run[] = [
  {
    name: "adapter-fastify: node",
    command: "pnpm run test:run-fastify:node",
    port: port++,
  },
  {
    name: "adapter-fastify: node router",
    command: "pnpm run test:run-fastify:node",
    port: port++,
    env: {
      TEST_CASE: "router",
    },
  },
  {
    name: "adapter-fastify: node router enhanced",
    command: "pnpm run test:run-fastify:node",
    port: port++,
    env: {
      TEST_CASE: "router_enhanced",
    },
  },
  {
    name: "adapter-fastify: bun",
    command: "pnpm run test:run-fastify:bun",
    port: port++,
  },
  // Fastify is NOT deno compatible
];

runTests(runs, {
  vitest,
  test(response) {
    // added by helmet
    vitest.expect(response.headers.has("content-security-policy")).toBe(true);
    vitest.expect(response.headers.has("x-xss-protection")).toBe(true);
  },
  testPost: true,
});

vitest.describe("response middleware", () => {
  function createApp() {
    const app = fastify();
    apply(app, [
      () => (response: Response) => {
        response.headers.set("x-from-middleware", "1");
        return response;
      },
    ]);
    return app;
  }

  vitest.it("answers HEAD on a GET route", async () => {
    const app = createApp();
    app.get("/page", () => "page");

    const head = await app.inject({ method: "HEAD", url: "/page" });
    vitest.expect(head.statusCode).toBe(200);
    vitest.expect(head.headers["x-from-middleware"]).toBe("1");
    vitest.expect(head.body).toBe("");
  });

  vitest.it("keeps a redirect", async () => {
    const app = createApp();
    app.get("/old", (_request, reply) => reply.redirect("/new"));

    const res = await app.inject({ url: "/old" });
    vitest.expect(res.statusCode).toBe(302);
    vitest.expect(res.headers.location).toBe("/new");
    vitest.expect(res.headers["x-from-middleware"]).toBe("1");
  });

  vitest.it("keeps an empty 204", async () => {
    const app = createApp();
    app.get("/empty", (_request, reply) => reply.code(204).send());

    const res = await app.inject({ url: "/empty" });
    vitest.expect(res.statusCode).toBe(204);
    vitest.expect(res.headers["x-from-middleware"]).toBe("1");
  });

  vitest.it("answers an unrouted path with a 404", async () => {
    const app = createApp();

    const res = await app.inject({ url: "/missing" });
    vitest.expect(res.statusCode).toBe(404);
    vitest.expect(res.headers["x-from-middleware"]).toBe("1");
  });
});
