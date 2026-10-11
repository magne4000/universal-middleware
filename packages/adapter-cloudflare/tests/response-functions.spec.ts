import { enhance } from "@universal-middleware/core";
import { expect, it } from "vitest";
import { apply, createPagesFunction } from "../src/index.js";

const step = (name: string, order?: number) =>
  enhance(
    () => (response: Response) => {
      response.headers.append("x-order", name);
      return response;
    },
    { name, order },
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

it("after a middleware answers, runs only the ones with a positive order", async () => {
  const ran: string[] = [];
  const refuses = enhance(() => new Response("unauthorized", { status: 401 }), { name: "refuses" });
  const worker = apply([
    refuses,
    enhance(() => void ran.push("sideEffect"), { name: "sideEffect" }),
    step("late", 300),
  ]);

  const response = (await worker.fetch(new Request("http://localhost/") as never, {}, {
    waitUntil() {},
    passThroughOnException() {},
  } as never)) as unknown as Response;
  expect(response.status).toBe(401);
  expect(ran).toEqual([]);
  expect(response.headers.get("x-order")).toBe("late");
});
