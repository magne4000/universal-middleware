import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { bodyReaders } from "@universal-middleware/tests/utils";
import { defineHandler, H3, toNodeHandler } from "h3";
import { expect, it } from "vitest";
import { apply } from "../src/index.js";

// A route still reads the body that the middlewares registered by apply() read

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
