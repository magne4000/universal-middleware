import { enhance } from "@universal-middleware/core";
import { type Run, runTests } from "@universal-middleware/tests";
import * as vitest from "vitest";
import { apply } from "../src/index.js";

const port = 3600;
const delay = process.env.CI ? 5000 : 1000;

const runs: Run[] = [
  {
    name: "adapter-cloudflare: pages",
    port: port,
    command: `pnpm run test:run-cloudflare:pages --inspector-port ${port + 10000}`,
    waitUntilType: "function",
    delay,
    streamCancel: "skip",
  },
  {
    name: "adapter-cloudflare: worker",
    port: port + 1,
    command: `pnpm run test:run-cloudflare:worker --define TEST_CASE:'"simple"' --inspector-port ${port + 10000 + 1}`,
    waitUntilType: "function",
    staticContext: true,
    delay,
    streamCancel: "skip",
  },
  {
    name: "adapter-cloudflare: worker router",
    port: port + 2,
    command: `pnpm run test:run-cloudflare:worker --define TEST_CASE:'"router"' --inspector-port ${port + 10000 + 2}`,
    waitUntilType: "function",
    staticContext: true,
    delay,
    streamCancel: "skip",
  },
  {
    name: "adapter-cloudflare: worker router enhanced",
    port: port + 3,
    command: `pnpm run test:run-cloudflare:worker --define TEST_CASE:'"router_enhanced"' --inspector-port ${port + 10000 + 3}`,
    waitUntilType: "function",
    staticContext: true,
    delay,
    streamCancel: "skip",
  },
];

runTests(runs, {
  vitest,
  retry: 3,
  concurrent: !process.env.CI,
});

vitest.describe("context", () => {
  vitest.it("does not leak into the next request through a shared env", async () => {
    const auth = enhance(
      (request: Request, context: Universal.Context) => {
        const user = request.headers.get("x-user");
        if (user) context.user = user;
      },
      { name: "auth" },
    );
    const me = enhance((_request: Request, context: Universal.Context) => new Response(String(context.user)), {
      name: "me",
      path: "/me",
      method: "GET",
    });
    const worker = apply([auth, me]);
    const ctx = { waitUntil() {}, passThroughOnException() {} };

    // Workers pass the same env object to every request
    const env = {};
    type Fetch = typeof worker.fetch;
    const fetch = (init?: RequestInit) =>
      worker.fetch(
        new Request("http://localhost/me", init) as unknown as Parameters<Fetch>[0],
        env,
        ctx as unknown as Parameters<Fetch>[2],
      );
    await fetch({ headers: { "x-user": "alice" } });
    vitest.expect(await (await fetch()).text()).toBe("undefined");
  });
});
