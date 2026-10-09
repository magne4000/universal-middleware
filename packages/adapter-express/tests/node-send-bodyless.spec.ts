import { createServer, get, type IncomingHttpHeaders, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import type { UniversalHandler } from "@universal-middleware/core";
import { afterEach, describe, expect, it } from "vitest";
import { createHandler } from "../src/index.js";

// `sendResponse` gave every Response without a body `Content-Length: 0`, which a 204 must not carry and which
// misstates a 304's representation (RFC 9110 §8.6).

let server: Server | undefined;

afterEach(() => {
  server?.close();
  server = undefined;
});

async function headersOf(handler: UniversalHandler): Promise<IncomingHttpHeaders> {
  const s = createServer(createHandler(() => handler)());
  await new Promise<void>((resolve) => s.listen(0, resolve));
  server = s;
  const res = await new Promise<IncomingMessage>((resolve) =>
    get(`http://localhost:${(s.address() as AddressInfo).port}/`, resolve),
  );
  res.resume();
  return res.headers;
}

describe("sendResponse — a Response without a body", () => {
  it("sends no Content-Length with a 204", async () => {
    const headers = await headersOf(() => new Response(null, { status: 204 }));
    expect(headers["content-length"]).toBeUndefined();
  });

  it("keeps the Content-Length a 304 describes", async () => {
    const headers = await headersOf(() => new Response(null, { status: 304, headers: { "content-length": "11" } }));
    expect(headers["content-length"]).toBe("11");
  });

  it("sends Content-Length: 0 for any other status", async () => {
    const headers = await headersOf(() => new Response(null, { status: 200 }));
    expect(headers["content-length"]).toBe("0");
  });
});
