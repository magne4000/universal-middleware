import { enhance, MiddlewareOrder } from "@universal-middleware/core";
import { apply } from "@universal-middleware/hono";
import { Hono } from "hono";
import { expect, it } from "vitest";
import compress from "../src/middleware";
import { decompressResponse } from "./utils";

const body = "hello ".repeat(1000);

// Like sirv(), it answers with a Response
const serves = enhance(() => new Response(body), { name: "serves" });

it("compresses the answer of a middleware it runs after", async () => {
  const app = new Hono();
  apply(app, [enhance(compress(), { order: MiddlewareOrder.RESPONSE_COMPRESSION }), serves]);

  const response = await app.fetch(new Request("http://localhost/", { headers: { "accept-encoding": "gzip" } }));

  expect(response.headers.get("content-encoding")).toBe("gzip");
  await expect(decompressResponse(response, "gzip")).resolves.toBe(body);
});
