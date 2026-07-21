import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import type { UniversalHandler } from "@universal-middleware/core";
import { afterEach, describe, expect, it } from "vitest";
import { createHandler } from "../src/index.js";

// `@universal-middleware/node` has no test setup of its own; `sendResponse` is
// exercised here because adapter-express builds directly on it.
//
// Ported from srvx#243 (HEAD responses must not pump the body stream).

describe("sendResponse — HEAD must not pump the body", () => {
  const servers: ReturnType<typeof createServer>[] = [];

  afterEach(() => {
    for (const server of servers.splice(0)) server.close();
  });

  function serve(handler: UniversalHandler): number {
    const server = createServer(createHandler(() => handler)());
    servers.push(server);
    server.listen();
    return (server.address() as AddressInfo).port;
  }

  it("cancels a streaming body instead of reading it to completion", async () => {
    let pulls = 0;
    let cancelled = false;
    // Lets the test release an otherwise endless body so it cannot outlive the run.
    let stop = false;

    const port = serve(
      () =>
        new Response(
          new ReadableStream<Uint8Array>({
            async pull(controller) {
              if (stop) return controller.close();
              pulls++;
              controller.enqueue(new Uint8Array(16));
              // A real SSE/streaming body never ends; the delay just keeps this
              // from spinning while the test observes it.
              await new Promise((resolve) => setTimeout(resolve, 5));
            },
            cancel() {
              cancelled = true;
            },
          }),
          { headers: { "content-type": "text/event-stream" } },
        ),
    );

    const ctrl = new AbortController();
    try {
      const res = await Promise.race([
        fetch(`http://localhost:${port}/`, { method: "HEAD", signal: ctrl.signal }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
      ]);

      // A HEAD response carries no body, so it must complete as soon as the
      // headers are known — it must not wait on (or drain) the body stream.
      expect(res, "HEAD request never completed: the body stream is still being pumped").not.toBeNull();
      expect((res as Response).status).toBe(200);
      expect((res as Response).headers.get("content-type")).toBe("text/event-stream");

      await new Promise((resolve) => setTimeout(resolve, 100));
      const seen = pulls;
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(pulls, "body stream is still being read after the HEAD response").toBe(seen);
      expect(cancelled, "body stream was never released").toBe(true);
    } finally {
      stop = true;
      ctrl.abort();
    }
  });

  it("reports the headers a GET would have sent", async () => {
    const port = serve(
      () => new Response("hello world", { headers: { "content-type": "text/plain", "x-custom": "kept" } }),
    );

    const res = await fetch(`http://localhost:${port}/`, { method: "HEAD" });

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/plain");
    expect(res.headers.get("x-custom")).toBe("kept");
    expect(await res.text()).toBe("");
  });

  it("still sends the body for a GET", async () => {
    const port = serve(() => new Response("hello world", { headers: { "content-type": "text/plain" } }));

    const res = await fetch(`http://localhost:${port}/`);

    expect(res.status).toBe(200);
    expect(await res.text()).toBe("hello world");
  });
});
