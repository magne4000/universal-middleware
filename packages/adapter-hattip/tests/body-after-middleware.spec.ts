import { createRouter } from "@hattip/router";
import { bodyReaders } from "@universal-middleware/tests/utils";
import { expect, it } from "vitest";
import { apply } from "../src/index.js";

// A route still reads the body that the middlewares registered by apply() read

it.each(["POST", "PUT", "PATCH", "DELETE"])("%s: the route reads the body the middlewares read", async (method) => {
  const { middlewares, seen } = bodyReaders();
  const app = createRouter();
  apply(app, middlewares);
  app.use("/", async ({ request }) => new Response(await request.text()));

  const response = await app.buildHandler()({
    request: new Request("http://localhost/", { method, body: '{"a":1}' }),
    ip: "127.0.0.1",
    platform: {},
    env: () => undefined,
    passThrough() {},
    waitUntil() {},
  });
  expect(await response.text()).toBe('{"a":1}');
  expect(seen).toEqual(['{"a":1}', '{"a":1}']);
});
