import { enhance } from "@universal-middleware/core";
import { serve } from "srvx/generic";
import { expect, it } from "vitest";
import { apply, createMiddleware } from "../src/index.js";

const step = (name: string, order?: number) =>
  enhance(
    () => (response: Response) => {
      response.headers.append("x-order", name);
      return response;
    },
    { name, order },
  );

it("applies response functions in registration order", async () => {
  const server = serve({
    middleware: [createMiddleware(() => step("first"))(), createMiddleware(() => step("second"))()],
    fetch: () => new Response("ok"),
  });

  const response = await server.fetch(new Request("http://localhost/"));
  expect(response.headers.get("x-order")).toBe("first, second");
});

it("after a middleware answers, runs only the ones with a positive order", async () => {
  const ran: string[] = [];
  const refuses = enhance(() => new Response("unauthorized", { status: 401 }), { name: "refuses" });
  const server = serve({
    fetch: apply([refuses, enhance(() => void ran.push("sideEffect"), { name: "sideEffect" }), step("late", 300)]),
  });

  const response = await server.fetch(new Request("http://localhost/"));
  expect(response.status).toBe(401);
  expect(ran).toEqual([]);
  expect(response.headers.get("x-order")).toBe("late");
});
