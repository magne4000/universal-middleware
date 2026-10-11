import { enhance } from "@universal-middleware/core";
import { expect, it } from "vitest";
import { createPagesFunction } from "../src/index.js";

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
