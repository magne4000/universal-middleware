import { randomBytes } from "node:crypto";
import { Agent, request as httpRequest, type Server, type ServerResponse } from "node:http";
import { type AddressInfo, connect } from "node:net";
import { PassThrough, Readable } from "node:stream";
import { gzipSync } from "node:zlib";
import { enhance, type UniversalMiddleware } from "@universal-middleware/core";
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

  it("reaches a universal handler after express.json() when a middleware before the parser left it unread", async () => {
    const ignores: UniversalMiddleware = async () => {};
    const url = await start(
      (app) =>
        app.post(
          "/echo",
          express.json(),
          createHandler(() => async (request) => Response.json(await request.json()))(),
        ),
      [ignores],
    );
    const res = await postJson(`${url}/echo`, { a: 1 });
    expect(await res.json()).toEqual({ a: 1 });
  });

  it("aborts the request signal when the client leaves, without piling up listeners, after middlewares read the body", async () => {
    const warnings: string[] = [];
    const onWarning = (w: Error) => warnings.push(w.name);
    process.on("warning", onWarning);
    const reached = Promise.withResolvers<void>();
    const aborted = Promise.withResolvers<void>();
    const reads: UniversalMiddleware = async (request) => {
      await request.text();
    };
    const url = await start(
      (app) =>
        app.post(
          "/wait",
          createHandler(() => async (request) => {
            reached.resolve();
            await new Promise((resolve) => request.signal.addEventListener("abort", resolve, { once: true }));
            aborted.resolve();
            return new Response("too late");
          })(),
        ),
      Array(12).fill(reads),
    );
    const ctrl = new AbortController();
    const pending = fetch(`${url}/wait`, { method: "POST", body: "abc", signal: ctrl.signal }).catch(() => undefined);
    await reached.promise;
    ctrl.abort();
    await pending;
    // Times out if the signal of the Request made again for the handler never aborts
    await aborted.promise;
    process.off("warning", onWarning);
    expect(warnings).not.toContain("MaxListenersExceededWarning");
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

  it("fails express.json() with a 413 when the body was over 1 MiB and isn't handed back", async () => {
    const url = await start((app) => app.post("/big", express.json({ limit: "10mb" }), (_req, res) => res.send("ok")));
    const res = await postJson(`${url}/big`, { big: "x".repeat(2 * 1024 * 1024) });
    expect(res.status).toBe(413);
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

describe("a body of more than 1 MiB read by a universal middleware", () => {
  const readsAll: UniversalMiddleware = async (request) => {
    if (request.method === "POST") await request.arrayBuffer();
  };
  const routes = (app: express.Express) => {
    app.post("/raw", express.raw({ limit: "10mb" }), (req, res) => res.json(req.body.length));
    app.post("/iter", async (req, res) => {
      let length = 0;
      for await (const chunk of req) length += (chunk as Buffer).byteLength;
      res.json(length);
    });
    app.post("/never", (_req, res) => res.send("ok"));
    app.post("/pipes", (req, res) => {
      req.pipe(new PassThrough().resume()).on("finish", () => res.json("finish"));
    });
    // Reads as the issue's route does, answering with JSON on "end"
    app.post("/listens", (req, res) => {
      req.on("data", () => {});
      req.on("end", () => res.json("end"));
      if (req.query.error !== undefined)
        req.on("error", (err: { status: number }) => res.status(err.status).json("error"));
    });
  };
  const headers = { "content-type": "application/octet-stream" };
  const overCap = new Uint8Array(1024 * 1024 + 1);
  const post = (url: string, body: Uint8Array<ArrayBuffer>) =>
    fetch(url, { method: "POST", headers, body, signal: AbortSignal.timeout(3000) });

  it("fails express.raw() with a 413", async () => {
    const url = await start(routes, [readsAll]);
    expect((await post(`${url}/raw`, overCap)).status).toBe(413);
  });

  it("fails express.raw() with a 413 on a gzip body", async () => {
    const url = await start(routes, [readsAll]);
    // Random bytes don't compress: the gzip body stays over 1 MiB
    const body = new Uint8Array(gzipSync(randomBytes(1024 * 1024)));
    const res = await fetch(`${url}/raw`, {
      method: "POST",
      headers: { ...headers, "content-encoding": "gzip" },
      body,
      signal: AbortSignal.timeout(3000),
    });
    expect(res.status).toBe(413);
  });

  it("fails a route's `for await` over the request with a 413", async () => {
    const url = await start(routes, [readsAll]);
    expect((await post(`${url}/iter`, overCap)).status).toBe(413);
  });

  it("gives a route's own error listener the 413, without calling its end listener", async () => {
    const url = await start(routes, [readsAll]);
    const res = await post(`${url}/listens?error`, overCap);
    expect(res.status).toBe(413);
    expect(await res.json()).toBe("error");
  });

  it("emits no error to a route without an error listener", async () => {
    const url = await start(routes, [readsAll]);
    expect((await post(`${url}/listens`, overCap)).status).toBe(200);
  });

  it("leaves a route without an error listener as it was when an earlier handler only observes errors", async () => {
    const observed: number[] = [];
    const url = await start(routes, [readsAll], (app) =>
      app.use((req, _res, next) => {
        req.on("error", (err: { status: number }) => observed.push(err.status));
        next();
      }),
    );
    const res = await post(`${url}/listens`, overCap);
    expect(await res.json()).toBe("end");
    expect(observed).toEqual([]);
  });

  it("leaves a pipe to a stream without an error listener as it was", async () => {
    const url = await start(routes, [readsAll]);
    expect(await (await post(`${url}/pipes`, overCap)).json()).toBe("finish");
  });

  it("leaves a route that never reads the body answering as usual", async () => {
    const url = await start(routes, [readsAll]);
    const res = await post(`${url}/never`, overCap);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("ok");
  });

  it("still hands back a body of exactly 1 MiB", async () => {
    const url = await start(routes, [readsAll]);
    expect(await (await post(`${url}/raw`, new Uint8Array(1024 * 1024))).json()).toBe(1024 * 1024);
  });

  // One connection: a second request reuses the first one's socket, unless the server closed it
  const keepAlive = (url: string) => {
    const agent = new Agent({ keepAlive: true, maxSockets: 1 });
    const send = (path: string, body: Uint8Array<ArrayBuffer>) =>
      new Promise<{ status?: number; body: string; reused: boolean }>((resolve, reject) => {
        const req = httpRequest(`${url}${path}`, { method: "POST", headers, agent }, (res) => {
          let text = "";
          res.on("data", (chunk) => {
            text += chunk;
          });
          res.on("end", () => resolve({ status: res.statusCode, body: text, reused: req.reusedSocket }));
        });
        req.on("error", reject);
        req.end(body);
      });
    return { agent, send };
  };

  it.each(["/raw", "/iter"])("keeps the connection usable for the next request after %s", async (path) => {
    const { agent, send } = keepAlive(await start(routes, [readsAll]));
    try {
      await send(path, overCap);
      expect(await send(path, new Uint8Array(10))).toEqual({ status: 200, body: "10", reused: true });
    } finally {
      agent.destroy();
    }
  });

  it("closes the connection after a `for await` fails with the rest of the body unread", async () => {
    const readsPart: UniversalMiddleware = async (request) => {
      if (request.method !== "POST" || !request.body) return;
      const reader = request.body.getReader();
      for (let length = 0; length <= 1024 * 1024; ) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.byteLength;
      }
      reader.releaseLock();
    };
    const { agent, send } = keepAlive(await start(routes, [readsPart]));
    try {
      expect((await send("/iter", new Uint8Array(2_000_000))).status).toBe(413);
      expect(await send("/iter", new Uint8Array(10))).toEqual({ status: 200, body: "10", reused: false });
    } finally {
      agent.destroy();
    }
  });
});

// A positive-order middleware runs after an earlier one answered: the answer must still own the body it streams
describe("an answer that streams the request body, with a middleware after it", () => {
  const echoes: Record<string, UniversalMiddleware> = {
    untouched: (request) => new Response(request.body),
    "partly read": async (request) => {
      const reader = (request.body as ReadableStream<Uint8Array>).getReader();
      const first = await reader.read();
      return new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            if (first.value) controller.enqueue(first.value);
          },
          async pull(controller) {
            const { done, value } = await reader.read();
            if (done) controller.close();
            else controller.enqueue(value);
          },
        }),
      );
    },
  };
  const late = enhance(
    () => async (response: Response) => {
      const headers = new Headers(response.headers);
      headers.delete("content-length");
      return new Response(`late(${await response.text()})`, { status: response.status, headers });
    },
    { name: "late", order: 100 },
  );

  it.each(Object.keys(echoes))("sends the body, %s, through the later response function", async (name) => {
    const url = await start(() => {}, [echoes[name], late]);
    const res = await postJson(`${url}/echo`, { a: 1 });
    expect(await res.text()).toBe('late({"a":1})');
  });
});
