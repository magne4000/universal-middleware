import { ServerResponse } from "node:http";
import { type Run, runTests } from "@universal-middleware/tests";
import { setResponseHeaders } from "@universal-middleware/node";
import * as vitest from "vitest";

let port = 3100;

const runs: Run[] = [
  {
    name: "adapter-express: node simple",
    command: "pnpm run test:run-express:node",
    port: port++,
  },
  {
    name: "adapter-express: node router",
    command: "pnpm run test:run-express:node",
    port: port++,
    env: {
      TEST_CASE: "router",
    },
  },
  {
    name: "adapter-express: node router enhanced",
    command: "pnpm run test:run-express:node",
    port: port++,
    env: {
      TEST_CASE: "router_enhanced",
    },
  },
  {
    name: "adapter-express: bun",
    command: "pnpm run test:run-express:bun",
    port: port++,
    // https://github.com/oven-sh/bun/issues/14697
    streamCancel: "fail",
  },
  {
    name: "adapter-express: deno",
    command: "pnpm run test:run-express:deno",
    port: port++,
  },
  {
    name: "adapter-express: node simple express@4",
    command: "pnpm run test:run-express:node",
    port: port++,
    env: {
      EXPRESS_V4: "1",
    },
  },
  {
    name: "adapter-express: node router",
    command: "pnpm run test:run-express:node",
    port: port++,
    env: {
      TEST_CASE: "router",
      EXPRESS_V4: "1",
    },
  },
  {
    name: "adapter-express: node router enhanced",
    command: "pnpm run test:run-express:node",
    port: port++,
    env: {
      TEST_CASE: "router_enhanced",
      EXPRESS_V4: "1",
    },
  },
];

runTests(runs, {
  vitest,
  test(response) {
    // added by helmet
    vitest.expect(response.headers.has("content-security-policy")).toBe(true);
    vitest.expect(response.headers.has("x-xss-protection")).toBe(true);
    vitest
      .expect(response.headers.getSetCookie().filter((cookie) => cookie.startsWith("express-cookie-example=")))
      .toHaveLength(1);
  },
});

vitest.describe("setResponseHeaders mirror mode", () => {
  vitest.test("appends set-cookie headers when mirror mode is disabled", () => {
    const nodeResponse = new ServerResponse({} as never);
    nodeResponse.setHeader("set-cookie", ["express-cookie=old"]);
    const response = new Response(null, {
      headers: [["set-cookie", "universal-cookie=new"]],
    });

    setResponseHeaders(response, nodeResponse);

    vitest.expect(nodeResponse.getHeader("set-cookie")).toEqual(["express-cookie=old", "universal-cookie=new"]);
  });

  vitest.test("replaces multiple existing set-cookie headers", () => {
    const nodeResponse = new ServerResponse({} as never);
    nodeResponse.setHeader("set-cookie", ["express-cookie=old", "other-express-cookie=old"]);
    const response = new Response(null, {
      headers: [
        ["set-cookie", "universal-cookie=new"],
        ["set-cookie", "other-universal-cookie=new"],
      ],
    });

    setResponseHeaders(response, nodeResponse, true);

    vitest
      .expect(nodeResponse.getHeader("set-cookie"))
      .toEqual(["universal-cookie=new", "other-universal-cookie=new"]);
  });

  vitest.test("removes existing set-cookie headers when mirrored response omits them", () => {
    const nodeResponse = new ServerResponse({} as never);
    nodeResponse.setHeader("set-cookie", ["express-cookie=old"]);
    const response = new Response(null);

    setResponseHeaders(response, nodeResponse, true);

    vitest.expect(nodeResponse.hasHeader("set-cookie")).toBe(false);
  });
});
