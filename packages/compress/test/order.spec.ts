import { enhance, pipe, type RuntimeAdapter, type UniversalMiddleware } from "@universal-middleware/core";
import { expect, it } from "vitest";
import compress from "../src/middleware";
import { decompressResponse } from "./utils";

const body = "hello ".repeat(1000);
const runtime: RuntimeAdapter = { runtime: "other", adapter: "other", params: undefined };
const request = () => new Request("http://localhost/", { headers: { "accept-encoding": "gzip" } });

// A response function that rewrites the body: it must read it uncompressed
const rewrite: UniversalMiddleware = () => async (response) =>
  new Response((await response.text()).toUpperCase(), response);

// Answers with a Response, like `sirv()` for a file it serves
const serves = enhance(() => new Response(body), { name: "serves" });

it.each([
  ["compress() listed first", () => [compress(), rewrite, serves]],
  ["compress() listed last", () => [rewrite, serves, compress()]],
])("compresses the body a response function rewrote, %s", async (_, list) => {
  const response = (await pipe(...(list() as UniversalMiddleware[]))(request(), {}, runtime)) as Response;

  expect(response.headers.get("content-encoding")).toBe("gzip");
  await expect(decompressResponse(response, "gzip")).resolves.toBe(body.toUpperCase());
});

it.each([
  ["compress() listed first", () => [compress(), serves]],
  ["compress() listed last", () => [serves, compress()]],
])("compresses the answer of an earlier middleware, %s", async (_, list) => {
  const response = (await pipe(...(list() as UniversalMiddleware[]))(request(), {}, runtime)) as Response;

  expect(response.headers.get("content-encoding")).toBe("gzip");
  await expect(decompressResponse(response, "gzip")).resolves.toBe(body);
});
