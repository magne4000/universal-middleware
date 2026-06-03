import { enhance } from "@universal-middleware/core";
import { Elysia } from "elysia";
import { describe, expect, it } from "vitest";
import { apply } from "../src/index.js";

// A context-adding middleware. Reading `context.body` (which `cloneRequestWithBody`
// does) is what makes Elysia's sucrose inference eagerly parse the request body.
const ctxMw = enhance(async (_req, ctx) => ({ ...ctx, db: {} }), {
  name: "db",
  immutable: false,
});

// A handler that reads the RAW body, like tRPC's fetch adapter does.
const rawReader = enhance(
  async (request) => {
    const text = await request.text();
    return Response.json({ text });
  },
  { name: "raw", path: "/echo/**", method: ["GET", "POST"], immutable: false },
);

function buildApp() {
  const app = new Elysia();
  apply(app, [ctxMw, rawReader]);
  return app;
}

describe("@universal-middleware/elysia raw body preservation", () => {
  it.each([
    ['"x"', "JSON string primitive"],
    ["42", "JSON number primitive"],
    ["true", "JSON boolean primitive"],
    ['{"a":1}', "JSON object"],
    ["[1,2,3]", "JSON array"],
  ])("forwards %s (%s) to the handler unchanged", async (body) => {
    const app = buildApp();
    const res = await app.fetch(
      new Request("http://localhost/echo/1", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
      }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ text: body });
  });

  it("does not give a body to GET requests routed through apply()", async () => {
    const app = buildApp();
    const res = await app.fetch(
      new Request("http://localhost/echo/1", {
        method: "GET",
      }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ text: "" });
  });
});
