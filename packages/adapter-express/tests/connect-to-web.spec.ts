import type { IncomingMessage } from "node:http";
import { Readable } from "node:stream";
import type { RuntimeAdapterTarget, UniversalHandler } from "@universal-middleware/core";
import express from "express";
import { describe, expect, it } from "vitest";
import { connectToWeb, createHandler, createIncomingMessage } from "../src/index.js";

// In-process tests for `connectToWeb` driving a full Express app over the
// synthetic (no `runtime.node`) path — the bridge `@vikejs/express` relies on.

type Factory = () => UniversalHandler;

function appFrom(factory: Factory) {
  const app = express();
  app.all("/t", createHandler(factory)());
  const fh = connectToWeb(app);
  return (request: Request) => Promise.resolve(fh(request));
}

// Asserts the bridge produced a Response (instead of falling through to next())
// and narrows the type so the assertions below don't need non-null operators.
function defined(res: Response | undefined): Response {
  expect(res).toBeInstanceOf(Response);
  return res as Response;
}

// `duplex` is required for streaming request bodies but is missing from the DOM
// `RequestInit` type shipped with @types/node's lib here.
function streamingRequest(url: string, init: RequestInit & { body: BodyInit }): Request {
  return new Request(url, { ...init, duplex: "half" } as RequestInit);
}

describe("connectToWeb (synthetic path) — body & basics", () => {
  it("reads a POST JSON body and echoes it", async () => {
    const fh = appFrom(() => async (request) => {
      const data = await request.json();
      return Response.json({ ok: true, echo: data });
    });
    const res = defined(
      await fh(
        new Request("http://localhost/t", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text: "hello" }),
        }),
      ),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, echo: { text: "hello" } });
  });

  it("handles a GET request with no body", async () => {
    const fh = appFrom(() => async (request) => {
      const n = new URL(request.url).searchParams.get("n");
      return new Response(`n=${n}`);
    });
    const res = defined(await fh(new Request("http://localhost/t?n=42")));
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("n=42");
  });

  it("returns undefined when the connect handler calls next() without responding", async () => {
    const app = express();
    app.use("/t", (_req, _res, next) => next());
    const res = await connectToWeb(app)(new Request("http://localhost/t"));
    expect(res).toBeUndefined();
  });

  it("lets a Node body parser (express.json) read the request body", async () => {
    const app = express();
    app.use(express.json());
    app.post("/t", (req, res) => res.json(req.body));
    const res = defined(
      await connectToWeb(app)(
        new Request("http://localhost/t", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ hello: "world" }),
        }),
      ),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ hello: "world" });
  });
});

describe("connectToWeb (synthetic path) — Express connection metadata (socket stub)", () => {
  it("does not throw on req.protocol / req.secure (http)", async () => {
    const fh = appFrom(() => async (_request, _ctx, runtime) => {
      const req = (runtime as { req: express.Request }).req;
      return Response.json({ protocol: req.protocol, secure: req.secure });
    });
    const res = defined(await fh(new Request("http://localhost/t")));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ protocol: "http", secure: false });
  });

  it("reports https when the request URL is https", async () => {
    const fh = appFrom(() => async (_request, _ctx, runtime) => {
      const req = (runtime as { req: express.Request }).req;
      return Response.json({ protocol: req.protocol, secure: req.secure });
    });
    const res = defined(await fh(new Request("https://localhost/t")));
    expect(await res.json()).toEqual({ protocol: "https", secure: true });
  });

  it("does not throw on req.ip", async () => {
    const fh = appFrom(() => async (_request, _ctx, runtime) => {
      const req = (runtime as { req: express.Request }).req;
      return new Response(String(req.ip ?? "undefined"));
    });
    const res = defined(await fh(new Request("http://localhost/t")));
    expect(res.status).toBe(200);
  });
});

describe("connectToWeb (synthetic path) — responses", () => {
  it("preserves multiple Set-Cookie headers", async () => {
    const fh = appFrom(
      () => async () =>
        new Response("ok", {
          status: 200,
          headers: [
            ["set-cookie", "a=1; Path=/"],
            ["set-cookie", "b=2; Path=/"],
          ],
        }),
    );
    const res = defined(await fh(new Request("http://localhost/t")));
    expect(res.headers.getSetCookie()).toEqual(["a=1; Path=/", "b=2; Path=/"]);
  });

  it("preserves a 302 redirect with its Location", async () => {
    const fh = appFrom(() => async () => Response.redirect("http://localhost/next", 302));
    const res = defined(await fh(new Request("http://localhost/t")));
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("http://localhost/next");
  });

  it("returns a 204 with no body", async () => {
    const fh = appFrom(() => async () => new Response(null, { status: 204 }));
    const res = defined(await fh(new Request("http://localhost/t")));
    expect(res.status).toBe(204);
    expect(res.body).toBeNull();
  });

  it("streams a chunked response without buffering it all first", async () => {
    const fh = appFrom(() => async () => {
      const enc = new TextEncoder();
      let i = 0;
      const stream = new ReadableStream<Uint8Array>({
        pull(c) {
          if (i >= 4) return c.close();
          c.enqueue(enc.encode(`chunk${i++};`));
        },
      });
      return new Response(stream, { headers: { "content-type": "text/plain" } });
    });
    const res = defined(await fh(new Request("http://localhost/t")));
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("chunk0;chunk1;chunk2;chunk3;");
  });
});

describe("connectToWeb (synthetic path) — large body is streamed, not buffered", () => {
  it("round-trips a large request body byte-for-byte", async () => {
    const fh = appFrom(
      () => async (request) =>
        // echo the request body straight back as the response body (no buffering on our side)
        new Response(request.body, { headers: { "content-type": "application/octet-stream" } }),
    );
    const CHUNK = 1 << 20; // 1 MiB
    const COUNT = 32; // 32 MiB total
    let sent = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(c) {
        if (sent >= COUNT) return c.close();
        const buf = new Uint8Array(CHUNK);
        buf.fill(sent & 0xff);
        c.enqueue(buf);
        sent++;
      },
    });
    const res = defined(await fh(streamingRequest("http://localhost/t", { method: "POST", body })));
    expect(res.status).toBe(200);
    let received = 0;
    const reader = (res.body as ReadableStream<Uint8Array>).getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.length;
    }
    expect(received).toBe(CHUNK * COUNT);
  });
});

describe("connectToWeb (synthetic path) — abort propagation", () => {
  it("fires the handler's request.signal when the incoming request is aborted", async () => {
    let signalFired = false;
    const fh = appFrom(() => async (request) => {
      await new Promise<void>((resolve) => {
        request.signal.addEventListener("abort", () => {
          signalFired = true;
          resolve();
        });
        setTimeout(resolve, 2000);
      });
      return new Response("done");
    });

    const ctrl = new AbortController();
    // a body that never ends, so the request stays in-flight until aborted
    const body = new ReadableStream({ pull() {} });
    const pending = fh(streamingRequest("http://localhost/t", { method: "POST", body, signal: ctrl.signal })).catch(
      () => undefined,
    );
    await new Promise((r) => setTimeout(r, 50));
    ctrl.abort();
    await new Promise((r) => setTimeout(r, 100));
    await pending;
    expect(signalFired).toBe(true);
  });

  it("fires the handler's signal when the incoming request is already aborted", async () => {
    let signalFired = false;
    const fh = appFrom(() => async (request) => {
      await new Promise<void>((resolve) => {
        if (request.signal.aborted) {
          signalFired = true;
          return resolve();
        }
        request.signal.addEventListener("abort", () => {
          signalFired = true;
          resolve();
        });
        setTimeout(resolve, 1000);
      });
      return new Response("done");
    });

    const ctrl = new AbortController();
    ctrl.abort(); // aborted before connectToWeb is even called
    const body = new ReadableStream({ pull() {} });
    await fh(streamingRequest("http://localhost/t", { method: "POST", body, signal: ctrl.signal })).catch(
      () => undefined,
    );
    await new Promise((r) => setTimeout(r, 100));
    expect(signalFired).toBe(true);
  });

  it("fires the handler's signal when aborted mid-stream (after the response is readable)", async () => {
    let signalFired = false;
    const fh = appFrom(() => async (request) => {
      request.signal.addEventListener("abort", () => {
        signalFired = true;
      });
      const enc = new TextEncoder();
      let i = 0;
      const stream = new ReadableStream<Uint8Array>({
        async pull(c) {
          if (i >= 20) return c.close();
          c.enqueue(enc.encode(`chunk${i++};`));
          await new Promise((r) => setTimeout(r, 40));
        },
      });
      return new Response(stream, { headers: { "content-type": "text/plain" } });
    });

    const ctrl = new AbortController();
    const res = defined(
      await fh(
        streamingRequest("http://localhost/t", {
          method: "POST",
          body: new ReadableStream({ pull() {} }),
          signal: ctrl.signal,
        }),
      ),
    );
    const reader = (res.body as ReadableStream<Uint8Array>).getReader();
    await reader.read(); // first chunk -> response is now readable (abort listener must stay alive)
    ctrl.abort();
    await new Promise((r) => setTimeout(r, 150));
    expect(signalFired).toBe(true);
  });
});

describe("connectToWeb — real-Node path uses the provided req/res", () => {
  it("uses runtime.req instead of synthesizing an IncomingMessage", async () => {
    // A real-ish Node IncomingMessage carrying the body. connectToWeb must use it
    // (via the runtime.req branch) rather than calling createIncomingMessage.
    const realReq = Object.assign(Readable.from([Buffer.from(JSON.stringify({ from: "realNode" }))]), {
      url: "/t",
      method: "POST",
      headers: { "content-type": "application/json", host: "localhost" },
      socket: { encrypted: false, remoteAddress: "203.0.113.7" },
    }) as unknown as IncomingMessage;

    const app = express();
    app.all(
      "/t",
      createHandler(
        (): UniversalHandler => async (request) => Response.json({ ok: true, echo: await request.json() }),
      )(),
    );

    const runtime = { req: realReq } as unknown as RuntimeAdapterTarget<unknown>;
    const res = defined(
      await connectToWeb(app)(new Request("http://localhost/t", { method: "POST" }), undefined, runtime),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, echo: { from: "realNode" } });
  });
});

describe("createIncomingMessage", () => {
  it("builds an IncomingMessage with a socket stub and parsed url/method/headers", () => {
    const req = createIncomingMessage(
      new Request("https://localhost/a/b?x=1", { method: "PUT", headers: { "x-test": "1" } }),
    );
    expect(req.url).toBe("/a/b?x=1");
    expect(req.method).toBe("PUT");
    expect(req.headers["x-test"]).toBe("1");
    // socket stub present so Express getters don't throw
    expect(req.socket).toBeDefined();
    expect((req.socket as unknown as { encrypted: boolean }).encrypted).toBe(true);
  });

  it("reports an HTTP version, as loggers like morgan read it", () => {
    const req = createIncomingMessage(new Request("http://localhost/"));
    expect(req.httpVersion).toBe("1.1");
    expect(req.httpVersionMajor).toBe(1);
    expect(req.httpVersionMinor).toBe(1);
  });

  it("exposes rawHeaders as name/value pairs", () => {
    const req = createIncomingMessage(new Request("http://localhost/", { headers: { "x-one": "1", "x-two": "2" } }));
    expect(req.rawHeaders).toContain("x-one");
    expect(req.rawHeaders[req.rawHeaders.indexOf("x-one") + 1]).toBe("1");
    expect(req.rawHeaders[req.rawHeaders.indexOf("x-two") + 1]).toBe("2");
  });

  it("marks a bodyless request complete straight away", () => {
    expect(createIncomingMessage(new Request("http://localhost/")).complete).toBe(true);
  });

  it("marks a request with a body complete only once the body has been read", async () => {
    const req = createIncomingMessage(new Request("http://localhost/", { method: "POST", body: "hello" }));
    expect(req.complete).toBe(false);

    await new Promise((resolve) => {
      req.on("data", () => {});
      req.on("end", resolve);
    });

    expect(req.complete).toBe(true);
  });
});
