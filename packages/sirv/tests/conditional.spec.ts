import { assert, describe, test } from "vitest";
import * as utils from "./helpers";

// Every response carries `Last-Modified`, but `If-Modified-Since` was never
// consulted, so a client holding a fresh copy was always sent the whole file
// again. Ported from srvx#269.

const FILE = "/bundle.67329.js";

describe("conditional requests :: If-Modified-Since", () => {
  test("should answer 304 when the copy the client holds is current", async () => {
    const server = utils.http();

    try {
      const first = await server.send("GET", FILE);
      const lastModified = first.headers.get("last-modified") as string;

      const res = await server.send("GET", FILE, { headers: { "If-Modified-Since": lastModified } });
      assert.equal(res.status, 304);
      assert.equal(await res.text(), "");
    } finally {
      server.close();
    }
  });

  test("should serve the file when the client's copy is older", async () => {
    const server = utils.http();

    try {
      const first = await server.send("GET", FILE);
      const stale = new Date(Date.parse(first.headers.get("last-modified") as string) - 60_000).toUTCString();

      const res = await server.send("GET", FILE, { headers: { "If-Modified-Since": stale } });
      assert.equal(res.status, 200);
    } finally {
      server.close();
    }
  });

  test("should ignore an unparseable date", async () => {
    const server = utils.http();

    try {
      const res = await server.send("GET", FILE, { headers: { "If-Modified-Since": "not a date" } });
      assert.equal(res.status, 200);
    } finally {
      server.close();
    }
  });
});

describe("conditional requests :: If-None-Match", () => {
  test("should match a list containing the current tag", async () => {
    const server = utils.http({ etag: true });

    try {
      const etag = (await server.send("GET", FILE)).headers.get("etag") as string;

      const res = await server.send("GET", FILE, { headers: { "If-None-Match": `W/"stale", ${etag}` } });
      assert.equal(res.status, 304);
    } finally {
      server.close();
    }
  });

  test("should match a strong tag against our weak one", async () => {
    const server = utils.http({ etag: true });

    try {
      const etag = (await server.send("GET", FILE)).headers.get("etag") as string;

      // RFC 9110 §13.1.2 compares `If-None-Match` weakly, so `W/` does not count.
      const res = await server.send("GET", FILE, { headers: { "If-None-Match": etag.replace("W/", "") } });
      assert.equal(res.status, 304);
    } finally {
      server.close();
    }
  });

  test('should match "*"', async () => {
    const server = utils.http({ etag: true });

    try {
      const res = await server.send("GET", FILE, { headers: { "If-None-Match": "*" } });
      assert.equal(res.status, 304);
    } finally {
      server.close();
    }
  });

  test("should take precedence over a matching If-Modified-Since", async () => {
    const server = utils.http({ etag: true });

    try {
      const first = await server.send("GET", FILE);
      const lastModified = first.headers.get("last-modified") as string;

      // The date says "unchanged", the tag says otherwise; the tag decides.
      const res = await server.send("GET", FILE, {
        headers: { "If-None-Match": 'W/"stale"', "If-Modified-Since": lastModified },
      });
      assert.equal(res.status, 200);
    } finally {
      server.close();
    }
  });

  test("should be ignored when no ETag is served", async () => {
    const server = utils.http({ etag: false });

    try {
      const res = await server.send("GET", FILE, { headers: { "If-None-Match": "*" } });
      assert.equal(res.status, 200);
    } finally {
      server.close();
    }
  });
});

describe("conditional requests :: the 304 itself", () => {
  test("should repeat the validators and caching directives", async () => {
    const server = utils.http({ etag: true, maxAge: 100 });

    try {
      const first = await server.send("GET", FILE);
      const etag = first.headers.get("etag") as string;

      const res = await server.send("GET", FILE, { headers: { "If-None-Match": etag } });
      assert.equal(res.status, 304);
      assert.equal(res.headers.get("etag"), etag);
      assert.equal(res.headers.get("last-modified"), first.headers.get("last-modified"));
      assert.equal(res.headers.get("cache-control"), "public,max-age=100");
    } finally {
      server.close();
    }
  });

  test("should not describe a representation it is not sending", async () => {
    const server = utils.http({ etag: true });

    try {
      const etag = (await server.send("GET", FILE)).headers.get("etag") as string;

      const res = await server.send("GET", FILE, { headers: { "If-None-Match": etag } });
      assert.equal(res.status, 304);
      assert.notOk(res.headers.get("content-type"));
    } finally {
      server.close();
    }
  });

  test("should keep Vary so a shared cache still keys on the encoding", async () => {
    const server = utils.http({ etag: true, gzip: true });

    try {
      const headers = { "Accept-Encoding": "gzip" };
      const etag = (await server.send("GET", "/", { headers })).headers.get("etag") as string;

      const res = await server.send("GET", "/", { headers: { ...headers, "If-None-Match": etag } });
      assert.equal(res.status, 304);
      assert.equal(res.headers.get("vary"), "Accept-Encoding");
    } finally {
      server.close();
    }
  });
});
