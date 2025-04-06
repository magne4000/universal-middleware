import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { handleCompression } from "../src/response";
import { decompressResponse } from "./utils";
import * as runtime from "../src/runtime";

// Helper to create a controlled stream for testing
function createControlledStream() {
  let controller: ReadableStreamDefaultController<Uint8Array> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
  });

  // Method to push chunks with delays to simulate streaming
  const pushChunks = async (chunks: Uint8Array[], delayMs = 10) => {
    for (const chunk of chunks) {
      controller?.enqueue(chunk);
      // Small delay to simulate streaming
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    controller?.close();
  };

  return { stream, pushChunks };
}

// Helper to create text encoder
const encoder = new TextEncoder();

// Helper to create chunks from strings
function createChunks(strings: string[]): Uint8Array[] {
  return strings.map((str) => encoder.encode(str));
}

// Helper to collect chunks from a ReadableStream
async function collectChunks(stream: ReadableStream<Uint8Array>): Promise<Uint8Array[]> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  return chunks;
}

describe("Streaming Compression", () => {
  // Save original values to restore after tests
  let originalIsZlibAvailable: boolean;

  beforeEach(() => {
    // Save original values
    originalIsZlibAvailable = runtime.isZlibAvailable;
  });

  afterEach(() => {
    // Restore original values
    vi.spyOn(runtime, "isZlibAvailable", "get").mockReturnValue(originalIsZlibAvailable);
    vi.restoreAllMocks();
  });

  describe("Zlib Implementation (Node.js)", () => {
    beforeEach(() => {
      // Force use of zlib implementation
      vi.spyOn(runtime, "isZlibAvailable", "get").mockReturnValue(true);
    });

    it("should flush gzip compressed data during streaming", async () => {
      const { stream, pushChunks } = createControlledStream();
      const inputChunks = createChunks([
        "This is the first chunk of data.",
        "This is the second chunk of data.",
        "This is the third chunk of data.",
      ]);

      // Start pushing chunks in the background
      const pushPromise = pushChunks(inputChunks);

      // Create response with streaming body
      const input = new Response(stream);

      // Apply compression
      const output = await handleCompression("gzip", input);
      expect(output.headers.get("Content-Encoding")).toBe("gzip");

      // Collect compressed chunks
      if (!output.body) {
        throw new Error("Expected compressed response to have a body");
      }
      const compressedChunks = await collectChunks(output.body);

      // Wait for all chunks to be pushed
      await pushPromise;

      // Verify we got at least as many chunks as we input (evidence of proper flushing)
      // We input 3 chunks, so we should get at least 3 chunks out
      expect(compressedChunks.length).toBeGreaterThanOrEqual(3);

      // Create a new response for decompression
      const decompressedOutput = new Response(new Blob(compressedChunks));
      decompressedOutput.headers.set("Content-Encoding", "gzip");

      // Decompress and verify content
      const decompressed = await decompressResponse(decompressedOutput, "gzip");
      expect(decompressed).toBe(
        "This is the first chunk of data." + "This is the second chunk of data." + "This is the third chunk of data.",
      );
    });

    it("should flush deflate compressed data during streaming", async () => {
      const { stream, pushChunks } = createControlledStream();
      const inputChunks = createChunks([
        "This is the first chunk of data.",
        "This is the second chunk of data.",
        "This is the third chunk of data.",
      ]);

      // Start pushing chunks in the background
      const pushPromise = pushChunks(inputChunks);

      // Create response with streaming body
      const input = new Response(stream);

      // Apply compression
      const output = await handleCompression("deflate", input);
      expect(output.headers.get("Content-Encoding")).toBe("deflate");

      // Collect compressed chunks
      if (!output.body) {
        throw new Error("Expected compressed response to have a body");
      }
      const compressedChunks = await collectChunks(output.body);

      // Wait for all chunks to be pushed
      await pushPromise;

      // Verify we got at least as many chunks as we input (evidence of proper flushing)
      // We input 3 chunks, so we should get at least 3 chunks out
      expect(compressedChunks.length).toBeGreaterThanOrEqual(3);

      // Create a new response for decompression
      const decompressedOutput = new Response(new Blob(compressedChunks));
      decompressedOutput.headers.set("Content-Encoding", "deflate");

      // Decompress and verify content
      const decompressed = await decompressResponse(decompressedOutput, "deflate");
      expect(decompressed).toBe(
        "This is the first chunk of data." + "This is the second chunk of data." + "This is the third chunk of data.",
      );
    });
  });

  describe("fflate Implementation (Browser/Edge)", () => {
    beforeEach(() => {
      // Force use of fflate implementation
      vi.spyOn(runtime, "isZlibAvailable", "get").mockReturnValue(false);
    });

    it("should flush gzip compressed data during streaming", async () => {
      const { stream, pushChunks } = createControlledStream();
      const inputChunks = createChunks([
        "This is the first chunk of data.",
        "This is the second chunk of data.",
        "This is the third chunk of data.",
      ]);

      // Start pushing chunks in the background
      const pushPromise = pushChunks(inputChunks);

      // Create response with streaming body
      const input = new Response(stream);

      // Apply compression
      const output = await handleCompression("gzip", input);
      expect(output.headers.get("Content-Encoding")).toBe("gzip");

      // Collect compressed chunks
      if (!output.body) {
        throw new Error("Expected compressed response to have a body");
      }
      const compressedChunks = await collectChunks(output.body);

      // Wait for all chunks to be pushed
      await pushPromise;

      // Verify we got at least as many chunks as we input (evidence of proper flushing)
      // We input 3 chunks, so we should get at least 3 chunks out
      expect(compressedChunks.length).toBeGreaterThanOrEqual(3);

      // Create a new response for decompression
      const decompressedOutput = new Response(new Blob(compressedChunks));
      decompressedOutput.headers.set("Content-Encoding", "gzip");

      // Decompress and verify content
      const decompressed = await decompressResponse(decompressedOutput, "gzip");
      expect(decompressed).toBe(
        "This is the first chunk of data." + "This is the second chunk of data." + "This is the third chunk of data.",
      );
    });

    it("should flush deflate compressed data during streaming", async () => {
      const { stream, pushChunks } = createControlledStream();
      const inputChunks = createChunks([
        "This is the first chunk of data.",
        "This is the second chunk of data.",
        "This is the third chunk of data.",
      ]);

      // Start pushing chunks in the background
      const pushPromise = pushChunks(inputChunks);

      // Create response with streaming body
      const input = new Response(stream);

      // Apply compression
      const output = await handleCompression("deflate", input);
      expect(output.headers.get("Content-Encoding")).toBe("deflate");

      // Collect compressed chunks
      if (!output.body) {
        throw new Error("Expected compressed response to have a body");
      }
      const compressedChunks = await collectChunks(output.body);

      // Wait for all chunks to be pushed
      await pushPromise;

      // Verify we got at least as many chunks as we input (evidence of proper flushing)
      // We input 3 chunks, so we should get at least 3 chunks out
      expect(compressedChunks.length).toBeGreaterThanOrEqual(3);

      // Create a new response for decompression
      const decompressedOutput = new Response(new Blob(compressedChunks));
      decompressedOutput.headers.set("Content-Encoding", "deflate");

      // Decompress and verify content
      const decompressed = await decompressResponse(decompressedOutput, "deflate");
      expect(decompressed).toBe(
        "This is the first chunk of data." + "This is the second chunk of data." + "This is the third chunk of data.",
      );
    });
  });

  describe("Comparison Tests", () => {
    it("should produce similar compression ratios between zlib and fflate", async () => {
      const testData = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".repeat(1000);
      const encoder = new TextEncoder();
      const inputData = encoder.encode(testData);

      // Test with zlib
      vi.spyOn(runtime, "isZlibAvailable", "get").mockReturnValue(true);
      const zlibInput = new Response(inputData);
      const zlibOutput = await handleCompression("gzip", zlibInput);
      const zlibCompressed = await zlibOutput.arrayBuffer();

      // Test with fflate
      vi.spyOn(runtime, "isZlibAvailable", "get").mockReturnValue(false);
      const fflateInput = new Response(inputData);
      const fflateOutput = await handleCompression("gzip", fflateInput);
      const fflateCompressed = await fflateOutput.arrayBuffer();

      // Both should compress the data significantly
      expect(zlibCompressed.byteLength).toBeLessThan(inputData.byteLength * 0.5);
      expect(fflateCompressed.byteLength).toBeLessThan(inputData.byteLength * 0.5);

      // Compression ratios should be reasonably close
      const zlibRatio = zlibCompressed.byteLength / inputData.byteLength;
      const fflateRatio = fflateCompressed.byteLength / inputData.byteLength;

      // Allow for some variation but they should be in the same ballpark
      expect(Math.abs(zlibRatio - fflateRatio)).toBeLessThan(0.1);
    });
  });
});
