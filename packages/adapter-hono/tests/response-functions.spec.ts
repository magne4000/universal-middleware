import { enhance, type UniversalMiddleware } from "@universal-middleware/core";
import { changedHeaders, changesHeaders, immutableResponses, received } from "@universal-middleware/tests/utils";
import { Hono } from "hono";
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
  const app = new Hono();
  apply(app, [step("first"), step("second")]);
  app.get("/", createHandler(() => () => new Response("ok"))());

  const response = await app.fetch(new Request("http://localhost/"));
  expect(response.headers.get("x-order")).toBe("first, second");
});

describe.each(immutableResponses)("a route returning $name", ({ response: immutable, status, body }) => {
  const replacesWith = () => () => immutable();
  const registrations: [string, (app: Hono, middlewares: UniversalMiddleware[]) => void][] = [
    [
      "apply()",
      (app, middlewares) =>
        apply(
          app,
          middlewares.map((m, i) => enhance(m, { name: `m${i}` })),
        ),
    ],
    [
      "createMiddleware()",
      (app, middlewares) => {
        for (const m of middlewares) app.use(createMiddleware(() => m)());
      },
    ],
  ];

  describe.each(registrations)("registered with %s", (_, register) => {
    it.each(["GET", "HEAD", "POST"])("%s: a response function changes its headers", async (method) => {
      const app = new Hono();
      register(app, [changesHeaders]);
      app.all("/", createHandler(() => immutable)());

      const response = await app.fetch(new Request("http://localhost/", { method }));
      expect(await received(response)).toEqual({ status, body: method === "HEAD" ? "" : body, ...changedHeaders });
    });

    it("a response function replaces the Response with it, the next one changes its headers", async () => {
      const app = new Hono();
      register(app, [replacesWith, changesHeaders]);
      app.get("/", createHandler(() => () => new Response("replaced"))());

      const response = await app.fetch(new Request("http://localhost/"));
      expect(await received(response)).toEqual({ status, body, ...changedHeaders });
    });
  });
});
