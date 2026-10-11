import { enhance } from "@universal-middleware/core";
import { Hono } from "hono";
import { expect, it } from "vitest";
import { apply, createHandler } from "../src/index.js";

const step = (name: string, order?: number) =>
  enhance(
    () => (response: Response) => {
      response.headers.append("x-order", name);
      return response;
    },
    { name, order },
  );

const refuses = enhance(() => new Response("unauthorized", { status: 401 }), { name: "refuses" });

it("applies response functions in registration order", async () => {
  const app = new Hono();
  apply(app, [step("first"), step("second")]);
  app.get("/", createHandler(() => () => new Response("ok"))());

  const response = await app.fetch(new Request("http://localhost/"));
  expect(response.headers.get("x-order")).toBe("first, second");
});

it("after a middleware answers, runs only the ones with a positive order", async () => {
  const ran: string[] = [];
  const app = new Hono();
  apply(app, [refuses, enhance(() => void ran.push("sideEffect"), { name: "sideEffect" }), step("late", 300)]);
  app.get("/", createHandler(() => () => new Response("route"))());

  const response = await app.fetch(new Request("http://localhost/"));
  expect(response.status).toBe(401);
  expect(ran).toEqual([]);
  expect(response.headers.get("x-order")).toBe("late");
});
