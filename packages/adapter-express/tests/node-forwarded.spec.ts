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
  // Proxies *append* to the forwarded headers, so the leftmost value is the one
  // the client sent and the rightmost is the one the trusted proxy contributed.
  // Reading left-to-right lets a client dictate the origin of `request.url`.
  it("resolves X-Forwarded-Host from the trusted hop, not the client-supplied value", () => {
    const adapter = createRequestAdapter({ trustProxy: true });
    const request = adapter(
      fakeReq({
        host: "real.example",
        // "evil.test" was spoofed by the client; "real.example" was appended by
        // the proxy we actually trust.
        "x-forwarded-host": "evil.test, real.example",
      }),
      fakeRes(),
    );

    expect(new URL(request.url).host).toBe("real.example");
  });

  it("resolves X-Forwarded-Proto from the trusted hop, not the client-supplied value", () => {
    const adapter = createRequestAdapter({ trustProxy: true });
    const request = adapter(
      fakeReq({
        host: "real.example",
        "x-forwarded-proto": "https, http",
      }),
      fakeRes(),
    );

    expect(new URL(request.url).protocol).toBe("http:");
  });

  it("still honors a single forwarded value from the proxy", () => {
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
