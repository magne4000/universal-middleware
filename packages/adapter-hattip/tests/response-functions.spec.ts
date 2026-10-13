import { createRouter, type Router } from "@hattip/router";
import { enhance, type UniversalMiddleware } from "@universal-middleware/core";
import { changedHeaders, changesHeaders, immutableResponses, received } from "@universal-middleware/tests/utils";
import { describe, expect, it } from "vitest";
import { apply, createHandler, createMiddleware } from "../src/index.js";

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

describe.each(immutableResponses)("a route returning $name", ({ response: immutable, status, body }) => {
  // Called in process: the server drops the body of a HEAD response
  const replacesWith = () => () => immutable();
  const registrations: [string, (app: Router, middlewares: UniversalMiddleware[]) => void][] = [
    ["apply()", (app, middlewares) => apply(app, middlewares)],
    [
      "createMiddleware()",
      (app, middlewares) => {
        for (const m of middlewares) app.use(createMiddleware(() => m)());
      },
    ],
  ];
  const send = (app: Router, method = "GET") =>
    app.buildHandler()({
      request: new Request("http://localhost/", { method }),
      ip: "127.0.0.1",
      platform: {},
      env: () => undefined,
      passThrough() {},
      waitUntil() {},
    });

  describe.each(registrations)("registered with %s", (_, register) => {
    it.each(["GET", "HEAD", "POST"])("%s: a response function changes its headers", async (method) => {
      const app = createRouter();
      register(app, [changesHeaders]);
      app.use("/", createHandler(() => immutable)());

      const response = await send(app, method);
      expect(await received(response)).toEqual({ status, body, ...changedHeaders });
    });

    it("a response function replaces the Response with it, the next one changes its headers", async () => {
      const app = createRouter();
      register(app, [replacesWith, changesHeaders]);
      app.get("/", createHandler(() => () => new Response("replaced"))());

      expect(await received(await send(app))).toEqual({ status, body, ...changedHeaders });
    });
  });
});
