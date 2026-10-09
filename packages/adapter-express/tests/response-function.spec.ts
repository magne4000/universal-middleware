import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import type { UniversalMiddleware } from "@universal-middleware/core";
import express from "express";
import { afterEach, describe, expect, it } from "vitest";
import { createMiddleware } from "../src/index.js";

// A response function holds the Express app's response back, so the adapter stands in for the socket:
// what the app sends and how it is sent must survive the detour.

let server: Server | undefined;

afterEach(() => {
  server?.closeAllConnections();
  server?.close();
  server = undefined;
});

const keepsResponse: UniversalMiddleware = () => (response: Response) => response;

async function start(setup: (app: express.Express) => void, responseFunction = keepsResponse): Promise<string> {
  const app = express();
  app.use(createMiddleware(() => responseFunction)());
  setup(app);
  const s = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, () => resolve(listening));
  });
  server = s;
  return `http://localhost:${(s.address() as AddressInfo).port}`;
}

/** An endless body: `cancelled` settles once it is cancelled */
function endlessBody() {
  const cancelled = Promise.withResolvers<void>();
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      controller.enqueue(new TextEncoder().encode("data: tick\n\n"));
    },
    cancel() {
      cancelled.resolve();
    },
  });
  return { body, cancelled: cancelled.promise };
}

describe("the app's response under a response function", () => {
  it("keeps the status and headers passed to writeHead", async () => {
    const url = await start((app) =>
      app.get("/", (_req, res) => {
        res.writeHead(201, { "content-type": "text/plain", "x-a": "1" });
        res.end("created");
      }),
    );
    const res = await fetch(url);
    expect(res.status).toBe(201);
    expect(res.headers.get("x-a")).toBe("1");
    expect(await res.text()).toBe("created");
  });

  it("keeps the status message and the repeated headers of writeHead's flat list", async () => {
    const url = await start((app) =>
      app.get("/", (_req, res) => {
        res.setHeader("x-a", "replaced");
        res.writeHead(202, "Taken", ["x-a", "1", "x-a", "2"]);
        res.end();
      }),
    );
    const res = await fetch(url);
    expect(res.status).toBe(202);
    expect(res.statusText).toBe("Taken");
    expect(res.headers.get("x-a")).toBe("1, 2");
  });

  it("decodes a string written with an encoding, calls the write callback, and chains end", async () => {
    const written = Promise.withResolvers<void>();
    const chained = Promise.withResolvers<boolean>();
    const url = await start((app) =>
      app.get("/", (_req, res) => {
        res.write("68656c6c6f", "hex", () => written.resolve());
        chained.resolve(res.end(" world") === res);
      }),
    );
    const res = await fetch(url);
    expect(await res.text()).toBe("hello world");
    await written.promise;
    expect(await chained.promise).toBe(true);
  });

  it("pushes back on an app that writes faster than the client reads, and drains", async () => {
    const stalls = Promise.withResolvers<number>();
    const url = await start((app) =>
      app.get("/", (_req, res) => {
        let written = 0;
        let stalled = 0;
        const pump = () => {
          while (written < 64) {
            written++;
            if (!res.write(Buffer.alloc(64 * 1024))) {
              stalled++;
              res.once("drain", pump);
              return;
            }
          }
          res.end();
          stalls.resolve(stalled);
        };
        pump();
      }),
    );
    const res = await fetch(url);
    expect((await res.arrayBuffer()).byteLength).toBe(64 * 64 * 1024);
    expect(await stalls.promise).toBeGreaterThan(0);
  });
});

describe("the Response a response function returns", () => {
  it("sends no body when it has none, rather than the app's", async () => {
    const url = await start(
      (app) => app.get("/", (_req, res) => res.send("secret")),
      () => () => new Response(null, { status: 403 }),
    );
    const res = await fetch(url);
    expect(res.status).toBe(403);
    expect(await res.text()).toBe("");
  });

  it("cancels an endless body once the client is gone", async () => {
    const { body, cancelled } = endlessBody();
    const url = await start(
      (app) => app.get("/", (_req, res) => res.send("app")),
      () => () => new Response(body, { headers: { "content-type": "text/event-stream" } }),
    );
    const ctrl = new AbortController();
    const res = await fetch(url, { signal: ctrl.signal });
    await res.body?.getReader().read();
    ctrl.abort();
    // Times out if the body is read on after the client left
    await cancelled;
  });

  it("answers HEAD without reading an endless body", async () => {
    const { body, cancelled } = endlessBody();
    const url = await start(
      (app) => app.get("/", (_req, res) => res.send("app")),
      () => () => new Response(body, { headers: { "content-type": "text/event-stream" } }),
    );
    const res = await fetch(url, { method: "HEAD" });
    expect(res.headers.get("content-type")).toBe("text/event-stream");
    expect(await res.text()).toBe("");
    await cancelled;
  });

  it("is read no faster than the socket sends it", async () => {
    const chunks = 128;
    let mostBuffered = 0;
    const replaces: UniversalMiddleware = (_request, _context, runtime) => () => {
      if (runtime.adapter !== "express") throw new Error("express only");
      const { res } = runtime;
      let sent = 0;
      return new Response(
        new ReadableStream<Uint8Array>({
          pull(controller) {
            mostBuffered = Math.max(mostBuffered, res.writableLength);
            if (sent++ === chunks) return controller.close();
            controller.enqueue(new Uint8Array(64 * 1024));
          },
        }),
      );
    };
    const url = await start((app) => app.get("/", (_req, res) => res.send("app")), replaces);
    const res = await fetch(url);
    expect((await res.arrayBuffer()).byteLength).toBe(chunks * 64 * 1024);
    // Without backpressure, most of the 8 MiB waits in the response's buffer
    expect(mostBuffered).toBeLessThan(1024 * 1024);
  });
});
