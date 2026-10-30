import { bodyReaders } from "@universal-middleware/tests/utils";
import { route } from "@webroute/route";
import { expect, it } from "vitest";
import { createMiddleware } from "../src/index.js";

// A route still reads the body that a middleware registered with use() read

it.each(["POST", "PUT", "PATCH", "DELETE"])("%s: the route reads the body a middleware read", async (method) => {
  const { middlewares, seen } = bodyReaders();
  const handler = route("/")
    .use(createMiddleware(() => middlewares[0])())
    .handle(async (request) => new Response(await request.text()));

  const response = await handler(new Request("http://localhost/", { method, body: '{"a":1}' }));
  expect(await response.text()).toBe('{"a":1}');
  expect(seen).toEqual(['{"a":1}']);
});
