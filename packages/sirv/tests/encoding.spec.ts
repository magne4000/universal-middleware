import { assert, describe, test } from "vitest";
import * as utils from "./helpers";

// Precompressed-variant negotiation (src/middleware.ts) matches the
// `Accept-Encoding` header with `String.includes` / a loose RegExp, so it never
// sees the quality values. RFC 9110 §12.5.3: "q=0" means *not acceptable*.
//
// Ported from the negotiation fixes in srvx#252.

describe("accept-encoding :: q=0 is a refusal", () => {
  test("should not serve a `.gz` variant when gzip is refused", async () => {
    const server = utils.http({ gzip: true });

    try {
      const res = await server.send("GET", "/", { headers: { "Accept-Encoding": "gzip;q=0" } });

      assert.equal(res.status, 200);
      assert.notOk(res.headers.get("content-encoding"), "must not encode with a refused encoding");
      await utils.matches(res, 200, "index.html", "utf8");
    } finally {
      server.close();
    }
  });

  test("should not serve a `.br` variant when brotli is refused", async () => {
    const server = utils.http({ brotli: true });

    try {
      const res = await server.send("GET", "/", { headers: { "Accept-Encoding": "br;q=0" } });

      assert.equal(res.status, 200);
      assert.notOk(res.headers.get("content-encoding"), "must not encode with a refused encoding");
      await utils.matches(res, 200, "index.html", "utf8");
    } finally {
      server.close();
    }
  });

  test("should fall back to gzip when only brotli is refused", async () => {
    const server = utils.http({ gzip: true, brotli: true });

    try {
      const res = await server.send("GET", "/", { headers: { "Accept-Encoding": "br;q=0, gzip" } });

      assert.equal(res.status, 200);
      assert.equal(res.headers.get("content-encoding"), "gzip");
      assert.equal(await res.text(), "gzip html\n");
    } finally {
      server.close();
    }
  });

  test("should 404 when the only representation is a refused encoding", async () => {
    // `data.js` exists on disk *only* as `data.js.gz` / `data.js.br`.
    const server = utils.http({ gzip: true });

    try {
      const res = await server.send("GET", "/data.js", { headers: { "Accept-Encoding": "gzip;q=0" } });

      assert.equal(res.status, 404);
    } finally {
      server.close();
    }
  });
});

describe("accept-encoding :: acceptable forms", () => {
  test("should serve a variant for the `*` wildcard", async () => {
    const server = utils.http({ gzip: true });

    try {
      const res = await server.send("GET", "/", { headers: { "Accept-Encoding": "*" } });

      assert.equal(res.status, 200);
      assert.equal(res.headers.get("content-encoding"), "gzip");
    } finally {
      server.close();
    }
  });

  test("should let an explicit `q=0` override a `*` wildcard", async () => {
    const server = utils.http({ gzip: true });

    try {
      const res = await server.send("GET", "/", { headers: { "Accept-Encoding": "*, gzip;q=0" } });

      assert.equal(res.status, 200);
      assert.notOk(res.headers.get("content-encoding"));
    } finally {
      server.close();
    }
  });

  test("should treat a valueless `q` as acceptable", async () => {
    const server = utils.http({ gzip: true });

    try {
      const res = await server.send("GET", "/", { headers: { "Accept-Encoding": "gzip;q" } });

      assert.equal(res.status, 200);
      assert.equal(res.headers.get("content-encoding"), "gzip");
    } finally {
      server.close();
    }
  });
});
