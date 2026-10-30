import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { enhance } from "@universal-middleware/core";
import { bodyReaders } from "@universal-middleware/tests/utils";
import { postWithRawBody } from "@universal-middleware/tests/utils-node";
import { defineHandler, H3, toNodeHandler } from "h3";
import { expect, it } from "vitest";
import { apply, createMiddleware } from "../src/index.js";

// A route still reads the body that the middlewares registered by apply(), or with app.use(), read

const methods = ["POST", "PUT", "PATCH", "DELETE"];

function appFor() {
  const { middlewares, seen } = bodyReaders();
  const app = new H3();
  apply(app, middlewares);
  app.all(
    "/",
    defineHandler((event) => event.req.text()),
  );
  return { app, seen };
}

it.each(methods)("%s: the route reads the body the middlewares read", async (method) => {
  const { app, seen } = appFor();

  const response = await app.fetch(new Request("http://localhost/", { method, body: '{"a":1}' }));
  expect(await response.text()).toBe('{"a":1}');
  expect(seen).toEqual(['{"a":1}', '{"a":1}']);
});

it.each(methods)("%s: the route reads the body a middleware registered with app.use() read", async (method) => {
  const { middlewares, seen } = bodyReaders();
  const app = new H3();
  app.use(createMiddleware(() => middlewares[0])());
  app.all(
    "/",
    defineHandler((event) => event.req.text()),
  );

  const response = await app.fetch(new Request("http://localhost/", { method, body: '{"a":1}' }));
  expect(await response.text()).toBe('{"a":1}');
  expect(seen).toEqual(['{"a":1}']);
});

// The Node server's request is not the runtime's own `Request`
it.each(methods)("%s on a Node server: the route reads the body the middlewares read", async (method) => {
  const { app, seen } = appFor();
  const server = createServer(toNodeHandler(app));
  const { promise, resolve } = Promise.withResolvers<void>();
  server.listen(0, "127.0.0.1", resolve);
  await promise;
  try {
    const response = await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/`, {
      method,
      body: '{"a":1}',
    });
    expect(await response.text()).toBe('{"a":1}');
    expect(seen).toEqual(['{"a":1}', '{"a":1}']);
  } finally {
    server.closeAllConnections();
    server.close();
  }
});

// srvx reads a `rawBody` only in `text()` and `json()`, so a request with one isn't kept (h3js/srvx#312)
it("on a Node server that set `req.rawBody`: the route reads the body after a middleware that doesn't", async () => {
  const app = new H3();
  apply(app, [enhance(() => undefined, { name: "cors" })]);
  app.post(
    "/",
    defineHandler((event) => event.req.json()),
  );
  expect(await postWithRawBody(toNodeHandler(app), '{"a":1}')).toEqual({ status: 200, body: '{"a":1}' });
});
