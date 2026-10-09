import type { Server, ServerResponse } from "node:http";
import { type AddressInfo, connect } from "node:net";
import { Readable } from "node:stream";
import type { UniversalMiddleware } from "@universal-middleware/core";
import express from "express";
import { afterEach, describe, expect, it } from "vitest";
import { adaptLendingBody } from "../src/body.js";
import { apply, connectToWeb, createHandler } from "../src/index.js";
import type { DecoratedRequest } from "../src/types.js";

// A universal middleware that reads the body and passes the request on must not
// leave the next Express handler with an empty body.

let server: Server | undefined;

afterEach(() => {
  server?.close();
  server = undefined;
});

const readsBody: UniversalMiddleware = async (request) => {
  if (request.method === "POST") await request.text();
};

function postJson(url: string, body: unknown): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(3000),
  });
}

async function start(
  setup: (app: express.Express) => void,
  middlewares = [readsBody],
  before?: (app: express.Express) => void,
): Promise<string> {
  const app = express();
  before?.(app);
  apply(app, middlewares);
  setup(app);
  const s = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, () => resolve(listening));
  });
  server = s;
  return `http://localhost:${(s.address() as AddressInfo).port}`;
}

describe("body read by a universal middleware", () => {
  it("reaches express.json() after two middlewares each read a multi-chunk body", async () => {
    const seen: number[] = [];
    const reads: UniversalMiddleware = async (request) => {
      seen.push((await request.text()).length);
    };
    const url = await start(
      (app) =>
        app.post("/echo", express.json({ limit: "1mb" }), (req, res) => res.json({ length: req.body.big.length })),
      [reads, reads],
    );
    const res = await postJson(`${url}/echo`, { big: "x".repeat(200_000) });
    expect(await res.json()).toEqual({ length: 200_000 });
    expect(seen).toEqual([200_010, 200_010]);
  });

  it("leaves a body that was already parsed into rawBody alone", async () => {
    const seen: string[] = [];
    const reads: UniversalMiddleware = async (request) => {
      seen.push(await request.text());
    };
    const url = await start(
      (app) => app.post("/echo", (_req, res) => res.end()),
      [reads],
      (app) =>
        app.use((req, _res, next) => {
          Object.assign(req, { rawBody: Buffer.from("parsed earlier") });
          next();
        }),
    );
    await postJson(`${url}/echo`, { a: 1 });
    expect(seen).toEqual(["parsed earlier"]);
  });

  it("reaches a universal handler after a middleware read it", async () => {
    const url = await start((app) =>
      app.post("/echo", createHandler(() => async (request) => new Response(await request.text()))()),
    );
    const res = await postJson(`${url}/echo`, { a: 1 });
    expect(await res.text()).toBe('{"a":1}');
  });

  it("answers with a Response built from a body the middleware already started reading", async () => {
    const forwards: UniversalMiddleware = (request) => new Response(request.body?.pipeThrough(new TransformStream()));
    const url = await start((app) => app.post("/echo", (_req, res) => res.end()), [forwards]);
    const big = "x".repeat(3_000_000);
    const res = await fetch(`${url}/echo`, { method: "POST", body: big, signal: AbortSignal.timeout(3000) });
    expect((await res.text()).length).toBe(big.length);
  });

  it("reaches express.json() after a middleware that cancelled the body", async () => {
    const cancels: UniversalMiddleware = async (request) => {
      if (request.method === "POST") await request.body?.cancel();
    };
    const url = await start((app) => app.post("/echo", express.json(), (req, res) => res.json(req.body)), [cancels]);
    const res = await postJson(`${url}/echo`, { a: 1 });
    expect(await res.json()).toEqual({ a: 1 });
  });

  it("gives the next middleware a readable body after one cancelled it without reading", async () => {
    const cancels: UniversalMiddleware = async (request) => {
      if (request.method === "POST") await request.body?.cancel();
    };
    const seen: string[] = [];
    const reads: UniversalMiddleware = async (request) => {
      if (request.method === "POST") seen.push(await request.text());
    };
    const url = await start(
      (app) => app.post("/echo", express.json(), (req, res) => res.json(req.body)),
      [cancels, reads],
    );
    const res = await postJson(`${url}/echo`, { a: 1 });
    expect(await res.json()).toEqual({ a: 1 });
    expect(seen).toEqual(['{"a":1}']);
  });

  it("hands the whole body to an error handler after a middleware read part of it and threw", async () => {
    const readsOneChunkAndThrows: UniversalMiddleware = async (request) => {
      if (request.method !== "POST") return;
      await request.body?.getReader().read();
      throw new Error("boom");
    };
    const url = await start(
      (app) => {
        app.post("/echo", (_req, res) => res.end());
        app.use((_err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
          let length = 0;
          req.on("data", (chunk: Buffer) => {
            length += chunk.byteLength;
          });
          req.on("end", () => res.json({ length }));
        });
      },
      [readsOneChunkAndThrows],
    );
    const res = await postJson(`${url}/echo`, { big: "x".repeat(200_000) });
    expect(await res.json()).toEqual({ length: 200_010 });
  });

  it("reaches express.json() when only a later middleware reads the body", async () => {
    const ignores: UniversalMiddleware = async () => {};
    const url = await start(
      (app) => app.post("/echo", express.json(), (req, res) => res.json(req.body)),
      [ignores, readsBody],
    );
    const res = await postJson(`${url}/echo`, { a: 1 });
    expect(await res.json()).toEqual({ a: 1 });
  });

  it("keeps one Request across middlewares that don't read the body", async () => {
    const warnings: string[] = [];
    const onWarning = (w: Error) => warnings.push(w.name);
    process.on("warning", onWarning);
    const seen: Request[] = [];
    const ignores: UniversalMiddleware = async (request) => {
      seen.push(request);
    };
    const url = await start((app) => app.get("/", (_req, res) => res.send("ok")), Array(12).fill(ignores));
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    process.off("warning", onWarning);
    expect(res.status).toBe(200);
    expect(warnings).not.toContain("MaxListenersExceededWarning");
    expect(new Set(seen).size).toBe(1);
  });

  it("reaches express.json() through connectToWeb's synthetic request", async () => {
    const app = express();
    apply(app, [readsBody]);
    app.post("/echo", express.json(), (req, res) => res.json(req.body));
    const res = await connectToWeb(app)(
      new Request("http://localhost/echo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ a: 1 }),
      }),
    );
    expect(await res?.json()).toEqual({ a: 1 });
  });

  it("reads a buffer larger than the request's high-water mark without raising it", async () => {
    const req = Object.assign(new Readable({ highWaterMark: 16, read() {} }), { method: "POST" }) as DecoratedRequest;
    req.push(Buffer.alloc(100));
    const request = adaptLendingBody(
      (r) => new Request("http://localhost/", { method: "POST", body: r.rawBody, duplex: "half" } as RequestInit),
      req,
      {} as ServerResponse,
    );
    const { value } = (await request.body?.getReader().read()) ?? {};
    expect(value?.byteLength).toBe(16);
    expect(req.readableHighWaterMark).toBe(16);
  });

  it("fails express.json() instead of hanging when the body was over 1 MiB and isn't handed back", async () => {
    const url = await start((app) => app.post("/big", express.json({ limit: "10mb" }), (_req, res) => res.send("ok")));
    const res = await postJson(`${url}/big`, { big: "x".repeat(2 * 1024 * 1024) });
    expect(res.status).toBe(400);
  });

  it("rejects a read left pending when the middleware returns, and still hands the body back", async () => {
    const outcome = Promise.withResolvers<string>();
    const forgets: UniversalMiddleware = (request) => {
      if (request.method === "POST") request.text().catch((err: Error) => outcome.resolve(err.message));
    };
    const url = await start((app) => app.post("/echo", express.json(), (req, res) => res.json(req.body)), [forgets]);
    const res = await postJson(`${url}/echo`, { a: 1 });
    expect(await res.json()).toEqual({ a: 1 });
    expect(await outcome.promise).toBe("The request body must be read before the middleware returns.");
  });

  it("rejects the middleware's read when the client aborts the upload", async () => {
    const reading = Promise.withResolvers<void>();
    const outcome = Promise.withResolvers<string>();
    const reads: UniversalMiddleware = async (request) => {
      const text = request.text();
      reading.resolve();
      await text.then(
        () => outcome.resolve("read"),
        () => outcome.resolve("rejected"),
      );
    };
    const url = await start((app) => app.post("/echo", (_req, res) => res.end()), [reads]);
    const socket = connect(Number(new URL(url).port), "localhost");
    socket.write("POST /echo HTTP/1.1\r\nhost: x\r\ncontent-length: 100\r\n\r\n12345");
    await reading.promise;
    socket.destroy();
    expect(await outcome.promise).toBe("rejected");
  });

  it("doesn't enqueue on a closed stream when the body arrives after a pending read was cancelled", async () => {
    const uncaught: Error[] = [];
    const onUncaught = (err: Error) => uncaught.push(err);
    process.on("uncaughtException", onUncaught);
    try {
      const cancelled = Promise.withResolvers<void>();
      const bodyArrived = Promise.withResolvers<void>();
      const cancels: UniversalMiddleware = async (request, _context, runtime) => {
        if (request.method !== "POST" || !request.body || runtime.adapter !== "express") return;
        const { req } = runtime;
        // The pending read makes the lend listen for "readable": cancel only once it does
        const listening = Promise.withResolvers<void>();
        const onListener = (event: string | symbol) => {
          if (event === "readable") listening.resolve();
        };
        req.on("newListener", onListener);
        const reader = request.body.getReader();
        reader.read().catch(() => {});
        await listening.promise;
        req.off("newListener", onListener);
        // Prepended, so it runs before the lend's listener in the same emit
        req.prependOnceListener("readable", () => bodyArrived.resolve());
        await reader.cancel();
        cancelled.resolve();
        await bodyArrived.promise;
      };
      const url = await start((app) => app.post("/echo", express.json(), (req, res) => res.json(req.body)), [cancels]);
      const socket = connect(Number(new URL(url).port), "localhost");
      const responded = Promise.withResolvers<void>();
      let response = "";
      socket.on("data", (chunk) => {
        response += chunk;
        if (response.includes('{"a":1}')) responded.resolve();
      });
      socket.write("POST /echo HTTP/1.1\r\nhost: x\r\ncontent-type: application/json\r\ncontent-length: 7\r\n\r\n");
      await cancelled.promise;
      socket.write('{"a":1}');
      // The lend's listener ran in the same emit as the one that resolved this: it must not have thrown
      await bodyArrived.promise;
      expect(uncaught).toEqual([]);
      // The next handler still gets the body; times out otherwise
      await responded.promise;
      socket.destroy();
    } finally {
      process.off("uncaughtException", onUncaught);
    }
  });
});
