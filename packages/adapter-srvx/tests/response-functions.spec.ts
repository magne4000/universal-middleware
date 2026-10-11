import { enhance } from "@universal-middleware/core";
import { serve } from "srvx/generic";
import { expect, it } from "vitest";
import { createMiddleware } from "../src/index.js";

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
