import { enhance, type HttpMethod, type UniversalHandler, type UniversalMiddleware } from "@universal-middleware/core";
import { changedHeaders, changesHeaders, immutableResponses, received } from "@universal-middleware/tests/utils";
import { serve } from "srvx/generic";
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
  const server = serve({
    middleware: [createMiddleware(() => step("first"))(), createMiddleware(() => step("second"))()],
    fetch: () => new Response("ok"),
  });

  const response = await server.fetch(new Request("http://localhost/"));
  expect(response.headers.get("x-order")).toBe("first, second");
});

describe.each(immutableResponses)("a route returning $name", ({ response: immutable, status, body }) => {
  // Called in process: the server drops the body of a HEAD response
  const replacesWith = () => () => immutable();
  const methods: HttpMethod[] = ["GET", "HEAD", "POST"];
  const servers: [string, (middlewares: UniversalMiddleware[], route: UniversalHandler) => ReturnType<typeof serve>][] =
    [
      [
        "apply()",
        (middlewares, route) =>
          serve({
            fetch: apply([
              ...middlewares.map((m, i) => enhance(m, { name: `m${i}` })),
              enhance(route, { path: "/", method: methods }),
            ]),
          }),
      ],
      [
        "createMiddleware()",
        (middlewares, route) =>
          serve({
            middleware: middlewares.map((m) => createMiddleware(() => m)()),
            fetch: createHandler(() => route)(),
          }),
      ],
    ];

  describe.each(servers)("registered with %s", (_, server) => {
    it.each(methods)("%s: a response function changes its headers", async (method) => {
      const response = await server([changesHeaders], immutable).fetch(new Request("http://localhost/", { method }));
      expect(await received(response)).toEqual({ status, body, ...changedHeaders });
    });

    it("a response function replaces the Response with it, the next one changes its headers", async () => {
      const response = await server([replacesWith, changesHeaders], () => new Response("replaced")).fetch(
        new Request("http://localhost/"),
      );
      expect(await received(response)).toEqual({ status, body, ...changedHeaders });
    });
  });
});
