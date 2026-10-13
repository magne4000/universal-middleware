import { enhance, type HttpMethod, type UniversalHandler, type UniversalMiddleware } from "@universal-middleware/core";
import { changedHeaders, changesHeaders, immutableResponses, received } from "@universal-middleware/tests/utils";
import { describe, expect, it } from "vitest";
import { apply, createPagesFunction } from "../src/index.js";

const step = (name: string) =>
  enhance(
    () => (response: Response) => {
      response.headers.append("x-order", name);
      return response;
    },
    { name },
  );

it("applies response functions in registration order", async () => {
  const functions = [createPagesFunction(() => step("first"))(), createPagesFunction(() => step("second"))()];
  const request = new Request("http://localhost/");
  // Like Pages, each function's `next()` calls the next one, and they all share the request's `data`
  const data = {};
  const call = (index: number): Promise<Response> =>
    index < functions.length
      ? (functions[index]({
          request,
          data,
          env: {},
          params: {},
          next: () => call(index + 1),
          waitUntil() {},
          passThroughOnException() {},
        } as never) as unknown as Promise<Response>)
      : Promise.resolve(new Response("ok"));

  const response = await call(0);
  expect(response.headers.get("x-order")).toBe("first, second");
});

describe.each(immutableResponses)("a route returning $name", ({ response: immutable, status, body }) => {
  // Called in process: the server drops the body of a HEAD response
  const replacesWith = () => () => immutable();
  const methods: HttpMethod[] = ["GET", "HEAD", "POST"];

  // Like Pages, each function's `next()` calls the next one, and the last one is the route
  function pages(middlewares: UniversalMiddleware[], route: () => Promise<Response>, method = "GET") {
    const functions = middlewares.map((m) => createPagesFunction(() => m)());
    const request = new Request("http://localhost/", { method });
    const data = {};
    const call = (index: number): Promise<Response> =>
      index < functions.length
        ? (functions[index]({
            request,
            data,
            env: {},
            params: {},
            next: () => call(index + 1),
            waitUntil() {},
            passThroughOnException() {},
          } as never) as unknown as Promise<Response>)
        : route();
    return call(0);
  }

  function worker(middlewares: UniversalMiddleware[], route: UniversalHandler, method = "GET") {
    const handler = apply([
      ...middlewares.map((m, i) => enhance(m, { name: `m${i}` })),
      enhance(route, { path: "/", method: methods }),
    ]);
    return handler.fetch(new Request("http://localhost/", { method }) as never, {}, {
      waitUntil() {},
      passThroughOnException() {},
    } as never) as unknown as Promise<Response>;
  }

  it.each(methods)("%s: a Pages function's response function changes its headers", async (method) => {
    const response = await pages([changesHeaders], immutable, method);
    expect(await received(response)).toEqual({ status, body, ...changedHeaders });
  });

  it.each(methods)("%s: a Worker's response function changes its headers", async (method) => {
    const response = await worker([changesHeaders], immutable, method);
    expect(await received(response)).toEqual({ status, body, ...changedHeaders });
  });

  it("a Pages function's response function replaces the Response with it, the next changes its headers", async () => {
    const response = await pages([replacesWith, changesHeaders], async () => new Response("replaced"));
    expect(await received(response)).toEqual({ status, body, ...changedHeaders });
  });

  it("a Worker's response function replaces the Response with it, the next changes its headers", async () => {
    const response = await worker([replacesWith, changesHeaders], () => new Response("replaced"));
    expect(await received(response)).toEqual({ status, body, ...changedHeaders });
  });
});
