import { createRouter } from "@hattip/router";
import { enhance } from "@universal-middleware/core";
import { expect, it } from "vitest";
import { apply, createHandler } from "../src/index.js";

const step = (name: string) =>
  enhance(
    () => (response: Response) => {
      response.headers.append("x-order", name);
      return response;
    },
    { name },
  );

it("applies response functions in registration order", async () => {
  const app = createRouter();
  apply(app, [step("first"), step("second")]);
  app.get("/", createHandler(() => () => new Response("ok"))());

  const response = await app.buildHandler()({
    request: new Request("http://localhost/"),
    ip: "127.0.0.1",
    platform: {},
    env: () => undefined,
    passThrough() {},
    waitUntil() {},
  });
  expect(response.headers.get("x-order")).toBe("first, second");
});
