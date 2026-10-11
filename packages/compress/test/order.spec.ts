import { enhance, pipe, type UniversalHandler, type UniversalMiddleware } from "@universal-middleware/core";
import { apply } from "@universal-middleware/hono";
import { Hono } from "hono";
import { expect, it } from "vitest";
import compress from "../src/middleware";
import { decompressResponse } from "./utils";

const body = "hello ".repeat(1000);

const rewrite: UniversalMiddleware = () => async (response) =>
  new Response((await response.text()).toUpperCase(), response);

const handler: UniversalHandler = () => new Response(body);

// Like sirv(), it answers with a Response
const serves = enhance(() => new Response(body), { name: "serves" });

it("compresses the body a response function rewrote, when registered before it", async () => {
  const response = await pipe(compress(), rewrite, handler)(
    new Request("http://localhost/", { headers: { "accept-encoding": "gzip" } }),
    {},
    {} as never,
  );

  expect(response.headers.get("content-encoding")).toBe("gzip");
  await expect(decompressResponse(response, "gzip")).resolves.toBe(body.toUpperCase());
});

it("compresses the answer of a middleware listed before it", async () => {
  const app = new Hono();
  apply(app, [serves, compress()]);

  const response = await app.fetch(new Request("http://localhost/", { headers: { "accept-encoding": "gzip" } }));

  expect(response.headers.get("content-encoding")).toBe("gzip");
  await expect(decompressResponse(response, "gzip")).resolves.toBe(body);
});
