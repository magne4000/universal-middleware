import { enhance } from "@universal-middleware/core";
import { type Run, runTests } from "@universal-middleware/tests";
import { Hono } from "hono";
import * as vitest from "vitest";
import { apply, createHandler } from "../src/index.js";

const port = 3050;

const expectInternalServerError = {
  tests: {
    throwLate: {
      expectedBody: "Internal Server Error",
    },
    throwEarlyAndLate: {
      expectedBody: "Internal Server Error",
    },
    throwEarly: {
      expectedBody: "Internal Server Error",
    },
  },
} satisfies Pick<Run, "tests">;

const runs: Run[] = [
  {
    name: "adapter-hono: node",
    command: "pnpm run test:run-hono:node",
    port: port,
    ...expectInternalServerError,
  },
  {
    name: "adapter-hono: node router",
    command: "pnpm run test:run-hono:node",
    port: port + 1,
    env: {
      TEST_CASE: "router",
    },
    ...expectInternalServerError,
  },
  {
    name: "adapter-hono: node router enhanced",
    command: "pnpm run test:run-hono:node",
    port: port + 2,
    env: {
      TEST_CASE: "router_enhanced",
    },
    ...expectInternalServerError,
  },
  {
    name: "adapter-hono: bun",
    command: "pnpm run test:run-hono:bun",
    port: port + 3,
    ...expectInternalServerError,
  },
  {
    name: "adapter-hono: deno",
    command: "pnpm run test:run-hono:deno",
    port: port + 4,
    ...expectInternalServerError,
  },
  {
    name: "adapter-hono: wrangler",
    command: `pnpm run test:run-hono:wrangler --inspector-port ${port + 10000 + 5}`,
    port: port + 5,
    waitUntilType: "function",
    delay: 1000,
    streamCancel: "skip",
  },
];

runTests(runs, {
  vitest,
  test(response, _body, run) {
    if (run.name !== "adapter-hono: wrangler") {
      // added by hono/secure-headers
      vitest.expect(response.headers.has("cross-origin-opener-policy")).toBe(true);
      vitest.expect(response.headers.has("x-xss-protection")).toBe(true);
    }
  },
});

vitest.describe("context", () => {
  vitest.it("does not leak into the next request through a shared env", async () => {
    const auth = enhance(
      (request: Request, context: Universal.Context) => {
        const user = request.headers.get("x-user");
        if (user) return { ...context, user };
      },
      { name: "auth" },
    );
    const app = new Hono();
    apply(app, [auth]);
    app.get(
      "/me",
      createHandler(() => (_request: Request, context: Universal.Context) => new Response(String(context.user)))(),
    );

    // Workers, Pages and Bun pass the same env object to every request
    const env = {};
    await app.fetch(new Request("http://localhost/me", { headers: { "x-user": "alice" } }), env);
    const response = await app.fetch(new Request("http://localhost/me"), env);
    vitest.expect(await response.text()).toBe("undefined");
  });

  vitest.it("reads the context srvx keeps on the request", async () => {
    const app = new Hono();
    app.get(
      "/me",
      createHandler(() => (_request: Request, context: Universal.Context) => new Response(String(context.user)))(),
    );

    // as the srvx adapter does for the middlewares it runs before Hono
    const request = Object.assign(new Request("http://localhost/me"), { context: { user: "alice" } });
    vitest.expect(await (await app.fetch(request)).text()).toBe("alice");
  });
});
