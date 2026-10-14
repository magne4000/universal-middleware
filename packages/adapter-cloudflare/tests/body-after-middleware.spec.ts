import { bodyReaders } from "@universal-middleware/tests/utils";
import { expect, it } from "vitest";
import { createPagesFunction } from "../src/index.js";

// A Pages route still reads the body that a Pages function before it read

it.each(["POST", "PUT", "PATCH", "DELETE"])("%s: the route reads the body a Pages function read", async (method) => {
  const { middlewares, seen } = bodyReaders();
  const request = new Request("http://localhost/", { method, body: '{"a":1}' });
  // Like Pages, `next()` without arguments hands the same request to the route
  const response = await createPagesFunction(() => middlewares[0])()({
    request,
    data: {},
    env: {},
    params: {},
    next: async () => new Response(await request.text()),
    waitUntil() {},
    passThroughOnException() {},
  } as never);

  expect(await (response as unknown as Response).text()).toBe('{"a":1}');
  expect(seen).toEqual(['{"a":1}']);
});
