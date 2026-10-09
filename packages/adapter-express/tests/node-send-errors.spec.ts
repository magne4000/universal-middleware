import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import type { UniversalHandler } from "@universal-middleware/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createHandler } from "../src/index.js";

// `sendResponse` swallowed every failure of the response pipeline, so a body
// that threw mid-stream produced a truncated response and no trace of why.
//
// Ported from srvx#243.

describe("sendResponse — failures while sending", () => {
  const servers: Server[] = [];

  afterEach(() => {
    for (const server of servers.splice(0)) server.close();
    vi.restoreAllMocks();
  });

  // `sent` settles once the handler is done sending the response, and so done deciding what to log
  function serve(handler: UniversalHandler): { port: number; sent: Promise<void> } {
    const nodeHandler = createHandler(() => handler)();
    const sent = Promise.withResolvers<void>();
    const server = createServer((req, res) => {
      nodeHandler<Promise<void>>(req, res).then(sent.resolve, sent.reject);
    });
    servers.push(server);
    server.listen();
    return { port: (server.address() as AddressInfo).port, sent: sent.promise };
  }

  it("reports a body stream that fails mid-response", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const boom = new Error("body exploded");

    const { port, sent } = serve(
      () =>
        new Response(
          new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(new TextEncoder().encode("partial"));
            },
            pull(controller) {
              controller.error(boom);
            },
          }),
          { headers: { "content-type": "text/plain" } },
        ),
    );

    // The response is already committed when the body fails, so the client sees
    // a truncated body rather than an error status — the log is the only signal.
    await fetch(`http://localhost:${port}/`)
      .then((res) => res.text())
      .catch(() => undefined);
    await sent;

    expect(consoleError).toHaveBeenCalledWith(boom);
  });

  it("stays quiet when the client disconnects mid-response", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    let stop = false;

    const { port, sent } = serve(
      () =>
        new Response(
          // Endless: backpressure, not a delay, keeps it from outrunning the client
          new ReadableStream<Uint8Array>({
            pull(controller) {
              if (stop) return controller.close();
              controller.enqueue(new Uint8Array(16 * 1024));
            },
          }),
          { headers: { "content-type": "application/octet-stream" } },
        ),
    );

    const ctrl = new AbortController();
    try {
      const res = await fetch(`http://localhost:${port}/`, { signal: ctrl.signal });
      const reader = (res.body as ReadableStream<Uint8Array>).getReader();
      await reader.read();
      ctrl.abort();
      await sent;

      expect(consoleError).not.toHaveBeenCalled();
    } finally {
      stop = true;
    }
  });

  it("cancels the body, quietly, when the client left before the response was ready", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const cancelled = Promise.withResolvers<void>();
    const reached = Promise.withResolvers<void>();

    const { port, sent } = serve(async (request) => {
      // Produce the Response only once the client is gone.
      reached.resolve();
      await new Promise((resolve) => request.signal.addEventListener("abort", resolve, { once: true }));
      return new Response(
        new ReadableStream<Uint8Array>(
          {
            pull(controller) {
              controller.enqueue(new Uint8Array(16));
            },
            cancel: () => cancelled.resolve(),
          },
          { highWaterMark: 0 },
        ),
      );
    });

    const ctrl = new AbortController();
    const pending = fetch(`http://localhost:${port}/`, { signal: ctrl.signal }).catch(() => undefined);
    await reached.promise;
    ctrl.abort();
    await pending;

    // Times out if the body is never cancelled
    await cancelled.promise;
    await sent;
    expect(consoleError).not.toHaveBeenCalled();
  });
});
