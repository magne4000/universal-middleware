import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import type { UniversalHandler } from "@universal-middleware/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createHandler } from "../src/index.js";

// `sendResponse` swallowed every failure of the response pipeline, so a body
// that threw mid-stream produced a truncated response and no trace of why.
//
// Ported from srvx#243.

describe("sendResponse — failures while sending", () => {
  const servers: ReturnType<typeof createServer>[] = [];

  afterEach(() => {
    for (const server of servers.splice(0)) server.close();
    vi.restoreAllMocks();
  });

  function serve(handler: UniversalHandler): number {
    const server = createServer(createHandler(() => handler)());
    servers.push(server);
    server.listen();
    return (server.address() as AddressInfo).port;
  }

  it("reports a body stream that fails mid-response", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const boom = new Error("body exploded");

    const port = serve(
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

    expect(consoleError).toHaveBeenCalledWith(boom);
  });

  it("stays quiet when the client disconnects mid-response", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    let stop = false;

    const port = serve(
      () =>
        new Response(
          new ReadableStream<Uint8Array>({
            async pull(controller) {
              if (stop) return controller.close();
              controller.enqueue(new Uint8Array(16 * 1024));
              await new Promise((resolve) => setTimeout(resolve, 10));
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
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(consoleError).not.toHaveBeenCalled();
    } finally {
      stop = true;
    }
  });

  it("cancels the body, quietly, when the client left before the response was ready", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    let resolveCancelled!: () => void;
    const cancelled = new Promise<void>((resolve) => {
      resolveCancelled = resolve;
    });
    let resolveReached!: () => void;
    const reached = new Promise<void>((resolve) => {
      resolveReached = resolve;
    });

    const port = serve(async (request) => {
      // Produce the Response only once the client is gone.
      resolveReached();
      await new Promise((resolve) => request.signal.addEventListener("abort", resolve, { once: true }));
      return new Response(
        new ReadableStream<Uint8Array>(
          {
            pull(controller) {
              controller.enqueue(new Uint8Array(16));
            },
            cancel: resolveCancelled,
          },
          { highWaterMark: 0 },
        ),
      );
    });

    const ctrl = new AbortController();
    const pending = fetch(`http://localhost:${port}/`, { signal: ctrl.signal }).catch(() => undefined);
    await reached;
    ctrl.abort();
    await pending;

    await expect(
      Promise.race([cancelled.then(() => "cancelled"), new Promise((r) => setTimeout(() => r("timeout"), 1000))]),
    ).resolves.toBe("cancelled");
    expect(consoleError).not.toHaveBeenCalled();
  });
});
