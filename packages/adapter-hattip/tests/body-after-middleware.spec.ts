import { createRouter, type Router } from "@hattip/router";
import { bodyReaders } from "@universal-middleware/tests/utils";
import { expect, it } from "vitest";
import { apply, createMiddleware } from "../src/index.js";

// A route still reads the body that the middlewares registered by apply(), or with app.use(), read

const methods = ["POST", "PUT", "PATCH", "DELETE"];

function send(app: Router, method: string) {
  return app.buildHandler()({
    request: new Request("http://localhost/", { method, body: '{"a":1}' }),
    ip: "127.0.0.1",
    platform: {},
    env: () => undefined,
    passThrough() {},
    waitUntil() {},
  });
}

it.each(methods)("%s: the route reads the body the middlewares read", async (method) => {
  const { middlewares, seen } = bodyReaders();
  const app = createRouter();
  apply(app, middlewares);
  app.use("/", async ({ request }) => new Response(await request.text()));

  const response = await send(app, method);
  expect(await response.text()).toBe('{"a":1}');
  expect(seen).toEqual(['{"a":1}', '{"a":1}']);
});

it.each(methods)("%s: the route reads the body a middleware registered with app.use() read", async (method) => {
  const { middlewares, seen } = bodyReaders();
  const app = createRouter();
  app.use(createMiddleware(() => middlewares[0])());
  app.use("/", async ({ request }) => new Response(await request.text()));

  const response = await send(app, method);
  expect(await response.text()).toBe('{"a":1}');
  expect(seen).toEqual(['{"a":1}']);
});
