import { assert, describe, test } from "vitest";
import * as utils from "./helpers";

// The pre-existing "ranges" block in sirv.spec.ts asserts response headers only,
// so the body the client actually receives is unverified — as are the parsing
// edge cases below. Ported from srvx#275.

const FILE = "/bundle.67329.js";

describe("ranges :: body", () => {
  test("should send only the requested bytes, not the whole file", async () => {
    const server = utils.http();

    try {
      const file = await utils.lookup("bundle.67329.js", "utf8");
      const res = await utils.sendRaw(server.address, "GET", FILE, { Range: "bytes=0-10" });

      assert.equal(res.status, 206);
      assert.equal(res.headers["content-length"], "11");
      assert.equal(res.headers["content-range"], `bytes 0-10/${file.size}`);
      // The body must match the advertised Content-Range/Content-Length.
      assert.equal(res.body.length, 11, "body length must match Content-Length");
      assert.equal(res.body.toString("utf8"), file.data.slice(0, 11));
    } finally {
      server.close();
    }
  });

  test("should send only the requested bytes :: middle", async () => {
    const server = utils.http();

    try {
      const file = await utils.lookup("bundle.67329.js", "utf8");
      const res = await utils.sendRaw(server.address, "GET", FILE, { Range: "bytes=6-96" });

      assert.equal(res.status, 206);
      assert.equal(res.body.length, 91, "body length must match Content-Length");
      assert.equal(res.body.toString("utf8"), file.data.slice(6, 97));
    } finally {
      server.close();
    }
  });

  test("should send only the requested bytes :: dev", async () => {
    const server = utils.http({ dev: true });

    try {
      const file = await utils.lookup("bundle.67329.js", "utf8");
      const res = await utils.sendRaw(server.address, "GET", FILE, { Range: "bytes=0-10" });

      assert.equal(res.status, 206);
      assert.equal(res.body.length, 11, "body length must match Content-Length");
      assert.equal(res.body.toString("utf8"), file.data.slice(0, 11));
    } finally {
      server.close();
    }
  });
});

describe("ranges :: parsing", () => {
  test("should treat a suffix range as the *last* N bytes", async () => {
    const server = utils.http();

    try {
      const file = await utils.lookup("bundle.67329.js", "utf8");
      // RFC 9110 §14.1.2: "bytes=-10" requests the final 10 bytes.
      const res = await utils.sendRaw(server.address, "GET", FILE, { Range: "bytes=-10" });

      assert.equal(res.status, 206);
      assert.equal(res.headers["content-range"], `bytes ${file.size - 10}-${file.size - 1}/${file.size}`);
      assert.equal(res.headers["content-length"], "10");
    } finally {
      server.close();
    }
  });

  test("should serve a single byte for `bytes=0-0`", async () => {
    const server = utils.http();

    try {
      const file = await utils.lookup("bundle.67329.js", "utf8");
      const res = await utils.sendRaw(server.address, "GET", FILE, { Range: "bytes=0-0" });

      assert.equal(res.status, 206);
      assert.equal(res.headers["content-range"], `bytes 0-0/${file.size}`);
      assert.equal(res.headers["content-length"], "1");
    } finally {
      server.close();
    }
  });

  test("should answer 416 for an unsatisfiable `bytes=-0` suffix range", async () => {
    const server = utils.http();

    try {
      const file = await utils.lookup("bundle.67329.js", "utf8");
      // A zero-length suffix range is unsatisfiable.
      const res = await utils.sendRaw(server.address, "GET", FILE, { Range: "bytes=-0" });

      assert.equal(res.status, 416);
      assert.equal(res.headers["content-range"], `bytes */${file.size}`);
    } finally {
      server.close();
    }
  });

  test("should ignore a malformed Range header and serve the full file", async () => {
    const server = utils.http();

    try {
      const file = await utils.lookup("bundle.67329.js", "utf8");
      // RFC 9110 §14.2: an unsatisfiable-to-parse Range is ignored.
      const res = await utils.sendRaw(server.address, "GET", FILE, { Range: "bytes=abc-def" });

      assert.equal(res.status, 200);
      assert.equal(res.headers["content-length"], String(file.size));
      assert.equal(res.headers["content-range"], undefined);
    } finally {
      server.close();
    }
  });

  test("should ignore a multi-range request and serve the full file", async () => {
    const server = utils.http();

    try {
      const file = await utils.lookup("bundle.67329.js", "utf8");
      // multipart/byteranges is not implemented, so the Range must be ignored
      // rather than silently answered with only its first range.
      const res = await utils.sendRaw(server.address, "GET", FILE, { Range: "bytes=0-1,5-6" });

      assert.equal(res.status, 200);
      assert.equal(res.headers["content-length"], String(file.size));
      assert.equal(res.headers["content-range"], undefined);
    } finally {
      server.close();
    }
  });

  test("should ignore a Range header whose unit is not `bytes`", async () => {
    const server = utils.http();

    try {
      const file = await utils.lookup("bundle.67329.js", "utf8");
      const res = await utils.sendRaw(server.address, "GET", FILE, { Range: "items=0-10" });

      assert.equal(res.status, 200);
      assert.equal(res.headers["content-length"], String(file.size));
      assert.equal(res.headers["content-range"], undefined);
    } finally {
      server.close();
    }
  });

  test("should ignore a backwards range and serve the full file", async () => {
    const server = utils.http();

    try {
      const file = await utils.lookup("bundle.67329.js", "utf8");
      // `bytes=5-2` is well-formed but last < first: RFC 9110 §14.2 ignores it,
      // as opposed to `bytes=1000-` past EOF which is genuinely unsatisfiable (416).
      const res = await utils.sendRaw(server.address, "GET", FILE, { Range: "bytes=5-2" });

      assert.equal(res.status, 200);
      assert.equal(res.headers["content-length"], String(file.size));
      assert.equal(res.headers["content-range"], undefined);
    } finally {
      server.close();
    }
  });
});

describe("ranges :: advertising", () => {
  test('should advertise "Accept-Ranges: bytes" on a normal 200 response', async () => {
    const server = utils.http();

    try {
      const res = await utils.sendRaw(server.address, "GET", FILE);

      assert.equal(res.status, 200);
      // Without this a client never knows it may issue a Range request.
      assert.equal(res.headers["accept-ranges"], "bytes");
    } finally {
      server.close();
    }
  });
});

describe("ranges :: precompressed variants", () => {
  test("should ignore a Range request for an encoded variant", async () => {
    const server = utils.http({ gzip: true });

    try {
      // A byte range over a `.gz` would hand the client a partial gzip stream.
      const res = await utils.sendRaw(server.address, "GET", "/data.js", {
        "Accept-Encoding": "gzip",
        Range: "bytes=0-4",
      });

      assert.equal(res.status, 200);
      assert.equal(res.headers["content-encoding"], "gzip");
      assert.equal(res.headers["content-range"], undefined);
      assert.equal(res.headers["accept-ranges"], undefined);
    } finally {
      server.close();
    }
  });
});
