import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { enhance, type HttpMethod } from "@universal-middleware/core";
import { bodyReaders } from "@universal-middleware/tests/utils";
import { withRawBody } from "@universal-middleware/tests/utils-node";
import { type NodeHttp1Handler, serve } from "srvx";
import { serve as serveGeneric } from "srvx/generic";
import { toNodeHandler } from "srvx/node";
import { expect, it } from "vitest";
import { apply } from "../src/index.js";

// A route still reads the body that the middlewares registered by apply() read

const methods: HttpMethod[] = ["POST", "PUT", "PATCH", "DELETE"];

function appFor(method: HttpMethod) {
  const { middlewares, seen } = bodyReaders();
  const route = enhance(async (request: Request) => new Response(await request.text()), { path: "/", method });
  return { fetch: apply([...middlewares, route]), seen };
}

it.each(methods)("%s: the route reads the body the middlewares read", async (method) => {
  const { fetch, seen } = appFor(method);

  const response = await serveGeneric({ fetch }).fetch(new Request("http://localhost/", { method, body: '{"a":1}' }));
  expect(await response.text()).toBe('{"a":1}');
  expect(seen).toEqual(['{"a":1}', '{"a":1}']);
});

// srvx's Node request is not the runtime's own `Request`
it.each(methods)("%s on a Node server: the route reads the body the middlewares read", async (method) => {
  const app = appFor(method);
  const server = serve({ port: 0, hostname: "127.0.0.1", fetch: app.fetch, silent: true });
  await server.ready();
  try {
    const response = await fetch(server.url as string, { method, body: '{"a":1}' });
    expect(await response.text()).toBe('{"a":1}');
    expect(app.seen).toEqual(['{"a":1}', '{"a":1}']);
  } finally {
    await server.close(true);
  }
});

it.each(methods)("%s on a Node server that set `req.rawBody`: the route reads the body", async (method) => {
  const app = appFor(method);
  const server = createServer(withRawBody(toNodeHandler(app.fetch) as NodeHttp1Handler));
  const { promise, resolve } = Promise.withResolvers<void>();
  server.listen(0, "127.0.0.1", resolve);
  await promise;
  try {
    const response = await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/`, {
      method,
      body: '{"a":1}',
    });
    expect(await response.text()).toBe('{"a":1}');
    expect(app.seen).toEqual(['{"a":1}', '{"a":1}']);
  } finally {
    server.closeAllConnections();
    server.close();
  }
});
