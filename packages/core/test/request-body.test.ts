import { describe, expect, test, vi } from "vitest";
import {
  enhance,
  type HttpMethod,
  keepBody,
  keptBody,
  pipe,
  pipeRoute,
  type RuntimeAdapter,
  type UniversalMiddleware,
} from "../src/index";

// A middleware of a list that read the request body left none for the middlewares and the handler after it:
// `Body is unusable`, or a read that never settles.

const runtime: RuntimeAdapter = { runtime: "other", adapter: "other", params: undefined };

const bytes = Uint8Array.from({ length: 256 }, (_, i) => i);
// A body that arrives in two chunks
function streamed() {
  const chunks = ["hel", "lo"];
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      const chunk = chunks.shift();
      if (chunk === undefined) controller.close();
      else controller.enqueue(new TextEncoder().encode(chunk));
    },
  });
}

const form = new FormData();
form.set("a", "1");

// Each body as the request carries it, and how a reader turns it into a comparable value
const payloads: [string, () => BodyInit, (request: Request) => Promise<unknown>][] = [
  ["text", () => "hello", (r) => r.text()],
  ["JSON", () => JSON.stringify({ a: 1 }), (r) => r.json()],
  ["bytes", () => bytes, async (r) => new Uint8Array(await r.arrayBuffer())],
  ["a multipart form", () => form, async (r) => Object.fromEntries(await r.formData())],
  ["a URL-encoded form", () => new URLSearchParams({ a: "1" }), async (r) => Object.fromEntries(await r.formData())],
  ["a stream", streamed, (r) => r.text()],
  ["an empty body", () => "", (r) => r.text()],
];

function requestWith(method: string, body: BodyInit) {
  return new Request("http://localhost/", { method, body, duplex: "half" } as RequestInit);
}

const readerOf =
  (read: (request: Request) => Promise<unknown>, seen: unknown[]): UniversalMiddleware =>
  async (request) => {
    seen.push(await read(request));
  };

describe.each<HttpMethod>(["POST", "PUT", "PATCH", "DELETE"])("%s", (method) => {
  describe.each(payloads)("with %s", (_, body, read) => {
    const expected = async () => read(requestWith(method, body()));

    test("pipe(): the handler reads the body a middleware read", async () => {
      const seen: unknown[] = [];
      const handler = pipe(readerOf(read, seen), async (request: Request) => {
        seen.push(await read(request));
        return new Response("ok");
      });

      await handler(requestWith(method, body()), {}, runtime);
      expect(seen).toEqual([await expected(), await expected()]);
    });

    test("pipe(): two middlewares read it, then the handler", async () => {
      const seen: unknown[] = [];
      const handler = pipe(readerOf(read, seen), readerOf(read, seen), async (request: Request) => {
        seen.push(await read(request));
        return new Response("ok");
      });

      await handler(requestWith(method, body()), {}, runtime);
      expect(seen).toEqual([await expected(), await expected(), await expected()]);
    });

    test("pipe(): what runs after the list reads the body a middleware read", async () => {
      const seen: unknown[] = [];
      const request = requestWith(method, body());

      expect(await pipe(readerOf(read, seen))(request, {}, runtime)).toBeUndefined();
      seen.push(await read(request));
      expect(seen).toEqual([await expected(), await expected()]);
    });

    test("a router: the route reads the body a middleware read", async () => {
      const seen: unknown[] = [];
      const router = pipeRoute([
        enhance(readerOf(read, seen), { name: "reader", order: -10 }),
        enhance(
          async (request: Request) => {
            seen.push(await read(request));
            return new Response("ok");
          },
          { path: "/", method },
        ),
      ]);

      const response = (await router(requestWith(method, body()), {}, runtime)) as Response;
      expect(response.status).toBe(200);
      expect(seen).toEqual([await expected(), await expected()]);
    });
  });
});

const bodyMethods: [string, (request: Request) => Promise<unknown>][] = [
  ["text", (r) => r.text()],
  ["json", (r) => r.json()],
  ["arrayBuffer", (r) => r.arrayBuffer()],
  // `bytes()` is missing from the DOM types
  ["bytes", (r) => (r as unknown as { bytes(): Promise<Uint8Array> }).bytes()],
  ["blob", (r) => r.blob()],
];

describe.each(bodyMethods)("after a middleware read the body with %s()", (_, read) => {
  const handlerSees = async (handler: (request: Request) => Promise<string>) => {
    let seen: string | undefined;
    await pipe(
      async (request: Request) => {
        await read(request);
      },
      async (request: Request) => {
        seen = await handler(request);
        return new Response("ok");
      },
    )(requestWith("POST", '{"a":1}'), {}, runtime);
    return seen;
  };

  test("the handler streams `request.body`", async () => {
    expect(await handlerSees((r) => new Response(r.body).text())).toBe('{"a":1}');
  });

  test("the handler reads a clone", async () => {
    expect(await handlerSees((r) => r.clone().text())).toBe('{"a":1}');
  });

  test("`bodyUsed` is false for the handler", async () => {
    expect(await handlerSees(async (r) => String(r.bodyUsed))).toBe("false");
  });
});

describe("pipe(), the request a middleware gets", () => {
  test("is the request itself, with a body", async () => {
    const request = requestWith("POST", "hello");
    const seen: Request[] = [];
    await pipe(
      async (r: Request) => {
        seen.push(r);
        await r.text();
      },
      (r: Request) => {
        seen.push(r);
        return new Response("ok");
      },
    )(request, {}, runtime);
    expect(seen[0]).toBe(request);
    expect(seen[1]).toBe(request);
  });

  test.each(["GET", "HEAD"])("%s: is left as it is", async (method) => {
    const request = new Request("http://localhost/", { method });
    await pipe(() => undefined)(request, {}, runtime);
    expect(Object.getOwnPropertyNames(request)).toEqual([]);
  });

  test("POST without a body: still has none after a middleware read it", async () => {
    const seen: unknown[] = [];
    await pipe(
      async (r: Request) => {
        await r.text();
      },
      (r: Request) => {
        seen.push(r.body, r.clone().body);
        return new Response("ok");
      },
    )(new Request("http://localhost/", { method: "POST" }), {}, runtime);
    expect(seen).toEqual([null, null]);
  });

  test.each(["GET", "POST"])("%s: `request.body` isn't read until something reads the body", async (method) => {
    const request = new Request("http://localhost/", { method, body: method === "POST" ? "hello" : null });
    let reads = 0;
    // On `@hono/node-server`, reading `body` builds the full Request
    Object.defineProperty(request, "body", {
      configurable: true,
      get() {
        reads++;
        return null;
      },
    });
    await pipe(
      () => undefined,
      () => new Response("ok"),
    )(request, {}, runtime);
    expect(reads).toBe(0);
  });

  test("the handler's formData() and blob() use the content-type a middleware set", async () => {
    const request = new Request("http://localhost/", {
      method: "POST",
      body: "a=1",
      headers: { "content-type": "text/plain" },
    });
    const seen: unknown[] = [];
    await pipe(
      (r: Request) => {
        r.headers.set("content-type", "application/x-www-form-urlencoded");
      },
      async (r: Request) => {
        seen.push(Object.fromEntries(await r.formData()), (await r.blob()).type);
        return new Response("ok");
      },
    )(request, {}, runtime);
    expect(seen).toEqual([{ a: "1" }, "application/x-www-form-urlencoded"]);
  });

  test.each(["application/x-www-form-urlencoded", "text/plain; charset=ISO-8859-1", undefined])(
    "blob() has the type the request's own blob() has, with content-type %s",
    async (type) => {
      const request = () =>
        new Request("http://localhost/", {
          method: "POST",
          body: bytes,
          headers: type ? { "content-type": type } : {},
        });
      const types: string[] = [];
      await pipe(
        async (r: Request) => {
          types.push((await r.blob()).type);
        },
        async (r: Request) => {
          types.push((await r.blob()).type);
          return new Response("ok");
        },
      )(request(), {}, runtime);
      const own = (await request().blob()).type;
      expect(types).toEqual([own, own]);
    },
  );

  test("an always middleware after the answer reads the body the answering one read", async () => {
    const seen: unknown[] = [];
    const response = await pipe(
      async (r: Request) => {
        seen.push(await r.text());
        return new Response("answered");
      },
      enhance(
        readerOf((r) => r.text(), seen),
        { runs: "always" },
      ),
    )(requestWith("POST", "hello"), {}, runtime);

    expect(await (response as Response).text()).toBe("answered");
    expect(seen).toEqual(["hello", "hello"]);
  });

  test("a response function reads the body the handler read", async () => {
    const seen: unknown[] = [];
    const response = await pipe(
      (r: Request) => async (response: Response) => {
        seen.push(await r.text());
        return response;
      },
      async (r: Request) => new Response(await r.text()),
    )(requestWith("POST", "hello"), {}, runtime);

    expect(await (response as Response).text()).toBe("hello");
    expect(seen).toEqual(["hello"]);
  });
});

describe("keepBody()", () => {
  test("another copy of the package keeps the same request", async () => {
    vi.resetModules();
    const other = await import("../src/index");
    expect(other.keepBody).not.toBe(keepBody);
    const request = requestWith("POST", "hello");
    keepBody(request);
    other.keepBody(request);
    const seen = [await request.text(), await request.text()];
    expect(seen).toEqual(["hello", "hello"]);
    expect(new TextDecoder().decode(await other.keptBody(request))).toBe("hello");
  });

  // `bytes()` is missing from the DOM types
  const bytesOf = (r: Request) => (r as unknown as { bytes(): Promise<Uint8Array> }).bytes();
  const changes: [string, (request: Request) => Promise<unknown>][] = [
    ["changes the bytes() it got", async (r) => (await bytesOf(r)).fill(74)],
    ["transfers the arrayBuffer() it got", async (r) => (await r.arrayBuffer()).transfer()],
    [
      "changes a chunk of a clone's stream",
      async (r) => {
        await r.text();
        (await r.clone().body?.getReader().read())?.value?.fill(74);
      },
    ],
    [
      "changes the bytes keptBody() returned",
      async (r) => {
        await r.text();
        new Uint8Array((await keptBody(r)) as ArrayBuffer).fill(74);
      },
    ],
  ];

  test.each(changes)("a reader that %s doesn't change what the next one reads", async (_, change) => {
    const request = requestWith("POST", "hello");
    keepBody(request);
    await change(request);
    expect(await request.text()).toBe("hello");
  });

  test("a body method can still be wrapped once the body is kept", async () => {
    const request = requestWith("POST", "hello");
    keepBody(request);
    const text = request.text.bind(request);
    Object.defineProperty(request, "text", { value: async () => (await text()).toUpperCase() });
    expect(await request.text()).toBe("HELLO");
  });
});
