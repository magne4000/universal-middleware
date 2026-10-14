import type { AddressInfo } from "node:net";
import { serve } from "@hono/node-server";
import { bodyReaders } from "@universal-middleware/tests/utils";
import { Hono } from "hono";
import { expect, it } from "vitest";
import { apply, createMiddleware } from "../src/index.js";

// A route still reads the body that the middlewares registered by apply(), or with app.use(), read

const methods = ["POST", "PUT", "PATCH", "DELETE"];

function appFor(method: string) {
  const { middlewares, seen } = bodyReaders();
  const app = new Hono();
  apply(app, middlewares);
  app.on(method, "/", async (c) => c.text(await c.req.text()));
  return { app, seen };
}

it.each(methods)("%s: the route reads the body the middlewares read", async (method) => {
  const { app, seen } = appFor(method);

  const response = await app.fetch(new Request("http://localhost/", { method, body: '{"a":1}' }));
  expect(await response.text()).toBe('{"a":1}');
  expect(seen).toEqual(['{"a":1}', '{"a":1}']);
});

it.each(methods)("%s: the route reads the body a middleware registered with app.use() read", async (method) => {
  const { middlewares, seen } = bodyReaders();
  const app = new Hono();
  app.use(createMiddleware(() => middlewares[0])());
  app.on(method, "/", async (c) => c.text(await c.req.text()));

  const response = await app.fetch(new Request("http://localhost/", { method, body: '{"a":1}' }));
  expect(await response.text()).toBe('{"a":1}');
  expect(seen).toEqual(['{"a":1}']);
});

// The Node server's request is not the runtime's own `Request`
it.each(methods)("%s on a Node server: the route reads the body the middlewares read", async (method) => {
  const { app, seen } = appFor(method);
  const { promise, resolve } = Promise.withResolvers<AddressInfo>();
  const server = serve({ fetch: app.fetch, port: 0, hostname: "127.0.0.1" }, resolve);
  try {
    const { port } = await promise;
    const response = await fetch(`http://127.0.0.1:${port}/`, { method, body: '{"a":1}' });
    expect(await response.text()).toBe('{"a":1}');
    expect(seen).toEqual(['{"a":1}', '{"a":1}']);
  } finally {
    server.close();
  }
});
