import { EventEmitter } from "node:events";
import { type IncomingMessage, ServerResponse } from "node:http";
import { createRequestAdapter, responseAdapter } from "@universal-middleware/node";
import { describe, expect, it } from "vitest";

// `@universal-middleware/node` has no test setup of its own; it is exercised
// here because adapter-express (and adapter-fastify) build directly on it.
//
// Ported from srvx#229 (hop-aware `X-Forwarded-*` resolution).

// biome-ignore lint/suspicious/noExplicitAny: minimal stand-ins for req/res
type Any = any;

function fakeReq(headers: Record<string, string>, url = "/p"): Any {
  return { method: "GET", url, headers, socket: {} };
}

function fakeRes(): Any {
  const res = new EventEmitter() as Any;
  res.writableEnded = false;
  return res;
}

describe("createRequestAdapter — X-Forwarded-* resolution", () => {
  // For host/proto, `trustProxy` follows Express's `trust proxy`: the first value
  // is the client-facing original, and the operator's proxy is trusted to set it
  // (overwriting any client-supplied value). Later entries are inner hops.
  it("reads the first X-Forwarded-Host — the public host, not an inner hop", () => {
    const adapter = createRequestAdapter({ trustProxy: true });
    const request = adapter(
      fakeReq({ host: "internal", "x-forwarded-host": "public.example, internal-lb:8080" }),
      fakeRes(),
    );

    expect(new URL(request.url).host).toBe("public.example");
  });

  it("reads the first X-Forwarded-Proto — the client-facing scheme", () => {
    const adapter = createRequestAdapter({ trustProxy: true });
    const request = adapter(fakeReq({ host: "real.example", "x-forwarded-proto": "https, http" }), fakeRes());

    expect(new URL(request.url).protocol).toBe("https:");
  });

  it("honors a single forwarded value from the proxy", () => {
    const adapter = createRequestAdapter({ trustProxy: true });
    const request = adapter(
      fakeReq({ host: "internal:8080", "x-forwarded-host": "public.example", "x-forwarded-proto": "https" }),
      fakeRes(),
    );

    expect(request.url).toBe("https://public.example/p");
  });

  it("ignores X-Forwarded-Host entirely when trustProxy is off", () => {
    const adapter = createRequestAdapter({ trustProxy: false });
    const request = adapter(fakeReq({ host: "real.example", "x-forwarded-host": "evil.test" }), fakeRes());

    expect(new URL(request.url).host).toBe("real.example");
  });
});

describe("createRequestAdapter — Forwarded (RFC 7239) resolution", () => {
  const adapt = (headers: Record<string, string>) =>
    createRequestAdapter({ trustProxy: true })(fakeReq(headers, "/p"), fakeRes());

  it("reads proto and host from a single element", () => {
    const request = adapt({ host: "internal", forwarded: "for=192.0.2.60;proto=https;host=public.example" });
    expect(request.url).toBe("https://public.example/p");
  });

  it("reads the first element — the public host — when the chain has several", () => {
    const request = adapt({
      host: "internal",
      forwarded: "host=public.example;proto=https, host=internal-lb:8080;proto=http",
    });
    expect(request.url).toBe("https://public.example/p");
  });

  it("treats parameter names case-insensitively", () => {
    const request = adapt({ host: "internal", forwarded: "Proto=https;Host=public.example" });
    expect(request.url).toBe("https://public.example/p");
  });

  it("does not split on a comma inside a quoted value", () => {
    // A quoted IPv6 `for` in the first element must not be read as two elements.
    const request = adapt({ host: "internal", forwarded: 'for="[2001:db8::1]:4711";proto=https;host=public.example' });
    expect(request.url).toBe("https://public.example/p");
  });

  it("unquotes a quoted host", () => {
    const request = adapt({ host: "internal", forwarded: 'proto=https;host="public.example:8443"' });
    expect(request.url).toBe("https://public.example:8443/p");
  });

  it("falls back to the connection when the first element omits the param", () => {
    // Only `for` was set, so proto/host come from the socket and Host.
    const request = adapt({ host: "real.example", forwarded: "for=192.0.2.60" });
    expect(request.url).toBe("http://real.example/p");
  });

  it("only fills params that X-Forwarded-* leaves out, so a passed-through Forwarded cannot override the proxy", () => {
    // The proxy set X-Forwarded-Host/Proto; a client `Forwarded` slipped through
    // but must not win — X-Forwarded-* is authoritative per param.
    const request = adapt({
      host: "internal",
      forwarded: "proto=https;host=evil.example",
      "x-forwarded-host": "public.example",
      "x-forwarded-proto": "https",
    });
    expect(request.url).toBe("https://public.example/p");
  });

  it("fills a param X-Forwarded-* omits", () => {
    // X-Forwarded-Proto present, X-Forwarded-Host absent: host comes from Forwarded.
    const request = adapt({
      host: "internal",
      forwarded: "host=public.example",
      "x-forwarded-proto": "https",
    });
    expect(request.url).toBe("https://public.example/p");
  });

  it("is ignored entirely when trustProxy is off", () => {
    const request = createRequestAdapter({ trustProxy: false })(
      fakeReq({ host: "real.example", forwarded: "host=evil.test;proto=https" }, "/p"),
      fakeRes(),
    );
    expect(request.url).toBe("http://real.example/p");
  });
});

describe("responseAdapter — redirect Location must not be attacker-controlled", () => {
  // `getFullUrl` absolutized a relative Location using X-Forwarded-Host with no
  // `trustProxy` gate at all, turning a local redirect into an open redirect.
  it("does not build the redirect origin from an untrusted X-Forwarded-Host", () => {
    const incoming = {
      headers: { host: "real.example", "x-forwarded-host": "evil.test" },
      socket: {},
    } as unknown as IncomingMessage;

    const res = new ServerResponse(incoming);
    res.statusCode = 302;
    res.setHeader("location", "/next");

    const response = responseAdapter(res);
    const location = response.headers.get("location") as string;

    expect(new URL(location).host).toBe("real.example");
  });

  it("does not build the redirect origin from an untrusted X-Forwarded-Proto", () => {
    const incoming = {
      headers: { host: "real.example", "x-forwarded-proto": "https" },
      socket: {},
    } as unknown as IncomingMessage;

    const res = new ServerResponse(incoming);
    res.statusCode = 302;
    res.setHeader("location", "/next");

    const response = responseAdapter(res);
    const location = response.headers.get("location") as string;

    expect(new URL(location).protocol).toBe("http:");
  });

  it("builds the redirect origin from Forwarded when trustProxy is on", () => {
    process.env.TRUST_PROXY = "1";
    try {
      const incoming = {
        headers: { host: "internal", forwarded: "proto=https;host=public.example" },
        socket: {},
      } as unknown as IncomingMessage;

      const res = new ServerResponse(incoming);
      res.statusCode = 302;
      res.setHeader("location", "/next");

      const location = responseAdapter(res).headers.get("location") as string;
      expect(location).toBe("https://public.example/next");
    } finally {
      delete process.env.TRUST_PROXY;
    }
  });

  it("leaves an absolute Location untouched", () => {
    const incoming = {
      headers: { host: "real.example", "x-forwarded-host": "evil.test" },
      socket: {},
    } as unknown as IncomingMessage;

    const res = new ServerResponse(incoming);
    res.statusCode = 301;
    res.setHeader("location", "https://elsewhere.example/there");

    const response = responseAdapter(res);

    expect(response.headers.get("location")).toBe("https://elsewhere.example/there");
  });
});
