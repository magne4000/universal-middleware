import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import * as runtime from "../src/runtime";

// Mock for testing flush behavior
class ChunkCollector {
  chunks: Uint8Array[] = [];

  ondata(chunk: Uint8Array) {
    this.chunks.push(chunk);
  }

  get chunkCount() {
    return this.chunks.length;
  }

  get totalSize() {
    return this.chunks.reduce((size, chunk) => size + chunk.length, 0);
  }
}

// Helper function to test compression flushing behavior
async function testCompressionFlushing(
  importPath: string,
  algorithm: string,
  description: string
) {
  it(`should flush ${description} data after each chunk`, async () => {
    // Import the implementation directly to test it
    const { compressStream } = await import(importPath);

    // Create a stream that will emit chunks with delays
    // Using larger chunks with repetitive data that will benefit from compression
    const encoder = new TextEncoder();
    const chunks = [
      encoder.encode("ABCDEFGHIJKLMNOPQRSTUVWXYZ".repeat(100)), // Repetitive data chunk 1
      encoder.encode("1234567890".repeat(200)),                 // Repetitive data chunk 2
      encoder.encode("abcdefghijklmnopqrstuvwxyz".repeat(100))  // Repetitive data chunk 3
    ];

    // Calculate total input size for comparison later
    const totalInputSize = chunks.reduce((size, chunk) => size + chunk.length, 0);

    // Create a readable stream that will emit chunks with delays
    const inputStream = new ReadableStream({
      async start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(chunk);
          // Wait a bit between chunks
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        controller.close();
      }
    });

    // Compress the stream
    const compressedStream = compressStream(inputStream, algorithm);

    // Collect the compressed chunks
    const collector = new ChunkCollector();
    if (!compressedStream) {
      throw new Error("Expected compressStream to return a non-null stream");
    }
    const reader = compressedStream.getReader();

    // Read all chunks with timeout protection
    const readChunks = async () => {
      const timeout = setTimeout(() => {
        throw new Error("Test timed out while reading chunks");
      }, 5000); // 5 second timeout

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          collector.ondata(value);
          // Small delay to simulate processing time
          await new Promise(resolve => setTimeout(resolve, 5));
        }
      } finally {
        clearTimeout(timeout);
      }
    };

    await readChunks();

    // We should have received at least as many chunks as we input (evidence of proper flushing)
    // We input 3 chunks, so we should get at least 3 chunks out
    expect(collector.chunkCount).toBeGreaterThanOrEqual(3);

    // Verify that compression actually reduced the data size
    // Since we're using repetitive data, compression should be effective
    expect(collector.totalSize).toBeLessThan(totalInputSize);

    const compressionRatio = collector.totalSize / totalInputSize;
    // Compression ratio should be significantly less than 1 (good compression)
    expect(compressionRatio).toBeLessThan(0.5);

    // Verify compression format signatures where applicable
    if (algorithm === "gzip" && collector.chunks.length > 0) {
      // Gzip header starts with 0x1F 0x8B
      expect(collector.chunks[0][0]).toBe(0x1F);
      expect(collector.chunks[0][1]).toBe(0x8B);
    }

    // We don't test timing behavior as it can be unstable across different environments
  });
}

describe("Compression Flush Behavior", () => {
  let originalIsZlibAvailable: boolean;

  beforeEach(() => {
    originalIsZlibAvailable = runtime.isZlibAvailable;
  });

  afterEach(() => {
    vi.spyOn(runtime, "isZlibAvailable", "get").mockReturnValue(originalIsZlibAvailable);
    vi.restoreAllMocks();
  });

  describe("fflate Implementation", () => {
    beforeEach(() => {
      vi.spyOn(runtime, "isZlibAvailable", "get").mockReturnValue(false);
    });

    // Test all supported algorithms with fflate
    testCompressionFlushing("../src/stream/stream.js", "gzip", "gzip");
    testCompressionFlushing("../src/stream/stream.js", "deflate", "deflate");
    testCompressionFlushing("../src/stream/stream.js", "deflate-raw", "deflate-raw");
  });

  describe("Zlib Implementation", () => {
    beforeEach(() => {
      vi.spyOn(runtime, "isZlibAvailable", "get").mockReturnValue(true);
    });

    // Test all supported algorithms with zlib
    testCompressionFlushing("../src/zlib/stream.js", "gzip", "gzip data with Z_SYNC_FLUSH");
    testCompressionFlushing("../src/zlib/stream.js", "deflate", "deflate data with Z_SYNC_FLUSH");
    testCompressionFlushing("../src/zlib/stream.js", "deflate-raw", "deflate-raw data with Z_SYNC_FLUSH");
    testCompressionFlushing("../src/zlib/stream.js", "br", "brotli data with BROTLI_OPERATION_FLUSH");
  });
});
