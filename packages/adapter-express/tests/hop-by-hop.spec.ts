import express from "express";
import { describe, expect, it } from "vitest";
import { connectToWeb } from "../src/index.js";

// `connectToWeb` rebuilds the web Response from the synthetic `ServerResponse`'s
// header snapshot, which also carries hop-by-hop headers (RFC 9110 §7.6.1).
// Those describe a single transport hop and must not cross the bridge: the
// captured body is *not* chunk-framed, so a `Transfer-Encoding: chunked` that
// rides along makes the re-served response unparseable.
//
// Ported from srvx#268 and srvx#270.

function defined(res: Response | undefined): Response {
  expect(res).toBeInstanceOf(Response);
  return res as Response;
}

function bridge(handler: express.RequestHandler) {
  const app = express();
  app.use("/t", handler);
  return () => Promise.resolve(connectToWeb(app)(new Request("http://localhost/t")));
}

describe("connectToWeb — hop-by-hop headers must not leak", () => {
  it("strips an explicitly set Transfer-Encoding, keeping the body verbatim", async () => {
    const fh = bridge((_req, res) => {
      res.writeHead(200, { "content-type": "text/plain", "transfer-encoding": "chunked" });
      res.write("hello");
      res.end("world");
    });

    const res = defined(await fh());
    expect(await res.text()).toBe("helloworld");
    expect(res.headers.get("transfer-encoding")).toBeNull();
  });

  it.each(["connection", "keep-alive", "upgrade", "te", "trailer", "proxy-authenticate"])(
    "strips the %s header",
    async (header) => {
      const fh = bridge((_req, res) => {
        res.setHeader("content-type", "text/plain");
        res.setHeader(header, "keep-alive");
        res.end("ok");
      });

      const res = defined(await fh());
      expect(await res.text()).toBe("ok");
      expect(res.headers.get(header)).toBeNull();
      // End-to-end headers must survive the filtering.
      expect(res.headers.get("content-type")).toBe("text/plain");
    },
  );

  it("strips headers named in the Connection header", async () => {
    const fh = bridge((_req, res) => {
      res.setHeader("connection", "close, x-internal");
      res.setHeader("x-internal", "secret");
      res.setHeader("x-public", "fine");
      res.end("ok");
    });

    const res = defined(await fh());
    expect(res.headers.get("connection")).toBeNull();
    expect(res.headers.get("x-internal")).toBeNull();
    expect(res.headers.get("x-public")).toBe("fine");
  });
});
