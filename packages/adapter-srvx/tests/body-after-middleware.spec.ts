import { enhance, type HttpMethod } from "@universal-middleware/core";
import { bodyReaders } from "@universal-middleware/tests/utils";
import { postWithRawBody } from "@universal-middleware/tests/utils-node";
import { type NodeHttp1Handler, serve } from "srvx";
import { serve as serveGeneric } from "srvx/generic";
import { toNodeHandler } from "srvx/node";
import { describe, expect, it } from "vitest";
import { apply, createMiddleware } from "../src/index.js";

// A route still reads the body that the middlewares registered by apply(), or as a srvx middleware, read

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

it.each(methods)("%s: the route reads the body a middleware registered as a srvx middleware read", async (method) => {
  const { middlewares, seen } = bodyReaders();
  const server = serveGeneric({
    middleware: [createMiddleware(() => middlewares[0])()],
    fetch: async (request) => new Response(await request.text()),
  });

  const response = await server.fetch(new Request("http://localhost/", { method, body: '{"a":1}' }));
  expect(await response.text()).toBe('{"a":1}');
  expect(seen).toEqual(['{"a":1}']);
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

// srvx reads a `rawBody` only in `text()` and `json()`, so a request with one isn't kept (h3js/srvx#312)
describe("on a Node server that set `req.rawBody`", () => {
  const listenerFor = (maxRequestBodySize?: number) => {
    const route = enhance(
      (request: Request) =>
        request.json().then(Response.json, (error: { status: number }) => new Response(null, { status: error.status })),
      { path: "/", method: "POST" },
    );
    return toNodeHandler(apply([enhance(() => undefined, { name: "cors" }), route]), {
      maxRequestBodySize,
    }) as NodeHttp1Handler;
  };

  it("the route reads the body after a middleware that doesn't", async () => {
    expect(await postWithRawBody(listenerFor(), '{"a":1}')).toEqual({ status: 200, body: '{"a":1}' });
  });

  it("a body over `maxRequestBodySize` answers 413", async () => {
    expect((await postWithRawBody(listenerFor(4), '{"a":1}')).status).toBe(413);
  });
});
