import { createServer, get, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import type { UniversalHandler } from "@universal-middleware/core";
import { afterEach, describe, expect, it } from "vitest";
import { createHandler } from "../src/index.js";

// `sendResponse` writes a body already in memory at once, with its length, and streams any other one.

let server: Server | undefined;

afterEach(() => {
  server?.closeAllConnections();
  server?.close();
  server = undefined;
});

/** `responses` collects the Node responses the handler sends into */
async function serve(handler: UniversalHandler, responses: ServerResponse[] = []): Promise<string> {
  const nodeHandler = createHandler(() => handler)();
  const s = createServer((req, res) => {
    responses.push(res);
    void nodeHandler(req, res);
  });
  await new Promise<void>((resolve) => s.listen(0, resolve));
  server = s;
  return `http://localhost:${(s.address() as AddressInfo).port}/`;
}

function request(url: string): Promise<IncomingMessage> {
  return new Promise((resolve) => get(url, resolve));
}

async function text(res: IncomingMessage): Promise<string> {
  let body = "";
  for await (const chunk of res) body += chunk;
  return body;
}

function completeStream(...chunks: string[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(chunk));
      controller.close();
    },
  });
}

describe("sendResponse — the body", () => {
  it.each([
    ["a string", () => new Response("hello world")],
    ["JSON", () => Response.json({ hello: "world" })],
    ["a stream that is already complete", () => new Response(completeStream("hello ", "world"))],
  ])("sends %s with its Content-Length", async (_, response) => {
    const expected = await response().text();
    const res = await request(await serve(response));
    expect(res.headers["content-length"]).toBe(String(Buffer.byteLength(expected)));
    expect(res.headers["transfer-encoding"]).toBeUndefined();
    expect(await text(res)).toBe(expected);
  });

  it("keeps the Content-Length the Response sets", async () => {
    const res = await request(await serve(() => new Response("hello", { headers: { "content-length": "5" } })));
    expect(res.headers["content-length"]).toBe("5");
    expect(await text(res)).toBe("hello");
  });

  it("streams a body whose source isn't ready", async () => {
    const release = Promise.withResolvers<void>();
    const url = await serve(
      () =>
        new Response(
          new ReadableStream<Uint8Array>({
            async start(controller) {
              controller.enqueue(new TextEncoder().encode("first "));
              await release.promise;
              controller.enqueue(new TextEncoder().encode("second"));
              controller.close();
            },
          }),
        ),
    );
    const res = await request(url);
    expect(res.headers["transfer-encoding"]).toBe("chunked");
    // The first chunk arrives before the source has the second one
    const first = await new Promise<string>((resolve) => res.once("data", (chunk) => resolve(String(chunk))));
    expect(first).toBe("first ");
    release.resolve();
    expect(await text(res)).toBe("second");
  });

  it("reads a body no faster than the client takes it", async () => {
    const chunks = 128;
    const responses: ServerResponse[] = [];
    let mostBuffered = 0;
    let sent = 0;
    const url = await serve(
      () =>
        new Response(
          new ReadableStream<Uint8Array>({
            pull(controller) {
              mostBuffered = Math.max(mostBuffered, responses[0].writableLength);
              if (sent++ === chunks) return controller.close();
              controller.enqueue(new Uint8Array(64 * 1024));
            },
          }),
        ),
      responses,
    );
    let received = 0;
    for await (const chunk of await request(url)) received += chunk.byteLength;
    expect(received).toBe(chunks * 64 * 1024);
    // Without backpressure, most of the 8 MiB waits in the response's buffer
    expect(mostBuffered).toBeLessThan(1024 * 1024);
  });
});
