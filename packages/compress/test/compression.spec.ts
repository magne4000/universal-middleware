import { describe, expect, it } from "vitest";
import { handleCompression } from "../src/response";

const hugeStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".repeat(2 * 1024 * 1024);

async function readableStreamToString(stream: ReadableStream<Uint8Array>): Promise<string> {
  const decoder = new TextDecoder();
  const reader = stream.getReader();
  let result = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value, { stream: true });
  }
  result += decoder.decode(); // End the decoding
  return result;
}

async function decompressStream(
  compressedStream: ReadableStream<Uint8Array>,
  algorithm: "gzip" | "deflate",
): Promise<string> {
  const decompressionStream = new DecompressionStream(algorithm);

  return await readableStreamToString(compressedStream.pipeThrough(decompressionStream));
}

describe.each([
  { encoding: "gzip", compressionMethod: "auto" },
  { encoding: "br", compressionMethod: "auto" },
  { encoding: "deflate", compressionMethod: "auto" },
  { encoding: "gzip", compressionMethod: "zlib" },
  { encoding: "br", compressionMethod: "zlib" },
  { encoding: "deflate", compressionMethod: "zlib" },
  { encoding: "gzip", compressionMethod: "stream" },
  { encoding: "deflate", compressionMethod: "stream" },
] as const)(
  "handleCompression: encoding: $encoding, compressionMethod: $compressionMethod",
  ({ encoding, compressionMethod }) => {
    it("should not compress again if input is compressed already", async () => {
      const input = new Response("Test Response");
      input.headers.set("Content-Encoding", "x-my-compressor");

      const output = await handleCompression(encoding, input, { compressionMethod });

      expect(output).toBeInstanceOf(Response);
      expect(output).toBe(input);
      expect(output.headers.get("Content-Encoding")).toBe(input.headers.get("Content-Encoding"));
    });

    it('should set "Vary": Accept-Encoding if not present on intermediate Response', async () => {
      const input = new Response("Test Response");

      const output = await handleCompression(encoding, input, { compressionMethod });

      expect(output).toBeInstanceOf(Response);
      expect(output).not.toBe(input);
      expect(output.headers.get("Content-Encoding")).toStrictEqual(encoding);
      expect(output.headers.get("Vary")).toStrictEqual("Accept-Encoding");
      expect(output.headers.get("Content-Length")).toBeNull();

      if (encoding !== "br") {
        // biome-ignore lint/style/noNonNullAssertion: <explanation>
        await expect(decompressStream(output.body!, encoding)).resolves.toBe("Test Response");
      }
    });

    it('should append Accept-Encoding to "Vary" header if already present on intermediate Response', async () => {
      const input = new Response("Test Response");
      input.headers.set("Vary", "x-funky");

      const output = await handleCompression(encoding, input, { compressionMethod });

      expect(output).toBeInstanceOf(Response);
      expect(output).not.toBe(input);
      expect(output.headers.get("Content-Encoding")).toStrictEqual(encoding);
      expect(output.headers.get("Vary")).to.include("x-funky");
      expect(output.headers.get("Vary")).to.include("Accept-Encoding");
      expect(output.headers.get("Content-Length")).toBeNull();
    });

    it("should fall back to status and status text of intermediate Response if neither is provided as options", async () => {
      const input = new Response("Test Response", { status: 418, statusText: "I'm a teapot" });

      const output = await handleCompression(encoding, input, { compressionMethod });

      expect(output).toBeInstanceOf(Response);
      expect(output).not.toBe(input);
      expect(output.headers.get("Content-Encoding")).toStrictEqual(encoding);
      expect(output.status).toStrictEqual(input.status);
      expect(output.status).toStrictEqual(418);
      expect(output.statusText).toStrictEqual(input.statusText);
      expect(output.statusText).toStrictEqual("I'm a teapot");
      expect(output.headers.get("Content-Length")).toBeNull();
    });

    it("should properly set status and status text if provided as options and override the values from intermediate Response", async () => {
      const input = new Response("Test Response", { status: 418, statusText: "I'm a teapot" });
      const options = { compressionMethod, status: 202, statusText: "Accepted" };

      const output = await handleCompression(encoding, input, options);

      expect(output).toBeInstanceOf(Response);
      expect(output).not.toBe(input);
      expect(output.headers.get("Content-Encoding")).toStrictEqual(encoding);
      expect(output.status).not.toStrictEqual(input.status);
      expect(output.status).toStrictEqual(options.status);
      expect(output.status).toStrictEqual(202);
      expect(output.statusText).not.toStrictEqual(input.statusText);
      expect(output.statusText).toStrictEqual(options.statusText);
      expect(output.statusText).toStrictEqual("Accepted");
      expect(output.headers.get("Content-Length")).toBeNull();
    });

    it("should not compress an empty body but still return new Response object", async () => {
      const input = new Response();

      const output = await handleCompression(encoding, input, { compressionMethod });

      expect(output).toBeInstanceOf(Response);
      expect(output).not.toBe(input);
      expect(output.headers.get("Content-Encoding")).toBeNull();
    });

    it("should compress large body", async () => {
      const input = new Response(hugeStr);

      const output = await handleCompression(encoding, input, { compressionMethod });

      expect(output).toBeInstanceOf(Response);
      expect(output.headers.get("Content-Encoding")).toStrictEqual(encoding);
      expect(output.headers.get("Content-Length")).toBeNull();

      if (encoding !== "br") {
        // biome-ignore lint/style/noNonNullAssertion: <explanation>
        await expect(decompressStream(output.body!, encoding)).resolves.toBe(hugeStr);
      }
    });
  },
);

describe("handleCompression: encoding: 'br', compressionMethod: 'stream'", () => {
  it("chould throw because CompressionStream does not support brotli", async () => {
    const input = new Response("Test Response");

    await expect(handleCompression("br", input, { compressionMethod: "stream" })).rejects.toThrow("compressionMethod");
  });
});
