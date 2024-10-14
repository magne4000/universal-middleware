import { describe, expect, it } from "vitest";
import { guessEncoding } from "../src/compress";
import { handleCompression } from "../src/response";
import { decompressResponse } from "./utils";

describe("guessEncoding", () => {
  const testCompression = async (
    acceptEncoding: string,
    expectedEncoding: string | null,
    body: BodyInit,
    options?: ResponseInit,
  ) => {
    const req = new Request("http://localhost", {
      method: "GET",
      headers: new Headers({ "Accept-Encoding": acceptEncoding }),
    });

    if (typeof body === "string" || body instanceof Uint8Array) {
      // biome-ignore lint/style/noParameterAssign: <explanation>
      options ??= {};
      options.headers ??= [];
      (options.headers as [string, string][]).push(["Content-Length", String(body.length)]);
    }

    let response = new Response(body, options);

    const encoding = guessEncoding(req, {}, response);

    if (encoding) {
      response = await handleCompression(encoding, response);
    }

    expect(response.headers.get("Content-Encoding")).toBe(expectedEncoding);
    return response;
  };

  describe("Compression Behavior", () => {
    it("should compress large responses with gzip", async () => {
      const res = await testCompression("gzip", "gzip", "a".repeat(1024));
      expect(res.headers.get("Content-Length")).toBeNull();
      expect((await res.arrayBuffer()).byteLength).toBeLessThan(1024);
    });

    it("should compress large responses with deflate", async () => {
      const res = await testCompression("deflate", "deflate", "a".repeat(1024));
      expect((await res.arrayBuffer()).byteLength).toBeLessThan(1024);
    });

    it("should prioritize gzip over deflate when both are accepted", async () => {
      await testCompression("gzip, deflate", "gzip", "a".repeat(1024));
    });

    it("should not compress small responses", async () => {
      const res = await testCompression("gzip, deflate", null, "small");
      expect(res.headers.get("Content-Length")).toBe("5");
    });

    it("should not compress when no Accept-Encoding is provided", async () => {
      await testCompression("", null, "small");
    });

    it("should not compress images", async () => {
      const res = await testCompression("gzip", null, new Uint8Array(1024), {
        headers: [["Content-Type", "image/jpeg"]],
      });
      expect(res.headers.get("Content-Type")).toBe("image/jpeg");
      expect(res.headers.get("Content-Length")).toBe("1024");
    });

    it("should not compress already compressed responses", async () => {
      const res = await testCompression("gzip", "br", new Uint8Array(1024), {
        headers: [
          ["Content-Type", "application/octet-stream"],
          ["Content-Encoding", "br"],
        ],
      });
      expect(res.headers.get("Content-Length")).toBe("1024");
    });
  });

  describe("Edge Cases", () => {
    it("should not compress responses with Cache-Control: no-transform", async () => {
      await testCompression("gzip", null, "a".repeat(1024), {
        headers: [
          ["Content-Type", "text/plain"],
          ["Cache-Control", "no-transform"],
        ],
      });
    });

    it("should handle HEAD requests without compression", async () => {
      const req = new Request("http://localhost/large", {
        method: "HEAD",
        headers: new Headers({ "Accept-Encoding": "gzip" }),
      });

      const encoding = guessEncoding(req, {});

      expect(encoding).toBeNull();
    });

    it("should compress custom 404 Not Found responses", async () => {
      const res = await testCompression("gzip", "gzip", "a".repeat(1024), {
        status: 404,
      });
      expect(res.status).toBe(404);
      const decompressed = await decompressResponse(res, "gzip");
      expect(decompressed).toBe("a".repeat(1024));
    });
  });
});
