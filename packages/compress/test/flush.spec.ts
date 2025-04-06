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

    it("should flush gzip data after each chunk", async () => {
      // Import the implementation directly to test it
      const { compressStream } = await import("../src/stream/stream.js");

      // Create a stream that will emit chunks with delays
      const chunks = [
        new Uint8Array([65, 66, 67, 68]), // "ABCD"
        new Uint8Array([69, 70, 71, 72]), // "EFGH"
        new Uint8Array([73, 74, 75, 76])  // "IJKL"
      ];

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
      const compressedStream = compressStream(inputStream, "gzip");

      // Collect the compressed chunks
      const collector = new ChunkCollector();
      if (!compressedStream) {
        throw new Error("Expected compressStream to return a non-null stream");
      }
      const reader = compressedStream.getReader();

      // Read all chunks
      const readChunks = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          collector.ondata(value);
          // Small delay to simulate processing time
          await new Promise(resolve => setTimeout(resolve, 5));
        }
      };

      await readChunks();

      // We should have received at least as many chunks as we input (evidence of proper flushing)
      // We input 3 chunks, so we should get at least 3 chunks out
      expect(collector.chunkCount).toBeGreaterThanOrEqual(3);

      // We don't test timing behavior as it can be unstable across different environments
    });

    it("should flush deflate data after each chunk", async () => {
      // Import the implementation directly to test it
      const { compressStream } = await import("../src/stream/stream.js");

      // Create a stream that will emit chunks with delays
      const chunks = [
        new Uint8Array([65, 66, 67, 68]), // "ABCD"
        new Uint8Array([69, 70, 71, 72]), // "EFGH"
        new Uint8Array([73, 74, 75, 76])  // "IJKL"
      ];

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
      const compressedStream = compressStream(inputStream, "deflate");

      // Collect the compressed chunks
      const collector = new ChunkCollector();
      if (!compressedStream) {
        throw new Error("Expected compressStream to return a non-null stream");
      }
      const reader = compressedStream.getReader();

      // Read all chunks
      const readChunks = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          collector.ondata(value);
          // Small delay to simulate processing time
          await new Promise(resolve => setTimeout(resolve, 5));
        }
      };

      await readChunks();

      // We should have received at least as many chunks as we input (evidence of proper flushing)
      // We input 3 chunks, so we should get at least 3 chunks out
      expect(collector.chunkCount).toBeGreaterThanOrEqual(3);

      // We don't test timing behavior as it can be unstable across different environments
    });
  });

  describe("Zlib Implementation", () => {
    beforeEach(() => {
      vi.spyOn(runtime, "isZlibAvailable", "get").mockReturnValue(true);
    });

    it("should flush gzip data with Z_SYNC_FLUSH", async () => {
      // This test will run on a proper Node.js environment

      // Import the implementation directly to test it
      const { compressStream } = await import("../src/zlib/stream.js");

      // Create a stream that will emit chunks with delays
      const chunks = [
        new Uint8Array([65, 66, 67, 68]), // "ABCD"
        new Uint8Array([69, 70, 71, 72]), // "EFGH"
        new Uint8Array([73, 74, 75, 76])  // "IJKL"
      ];

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
      const compressedStream = compressStream(inputStream, "gzip");

      // Collect the compressed chunks
      const collector = new ChunkCollector();
      if (!compressedStream) {
        throw new Error("Expected compressStream to return a non-null stream");
      }
      const reader = compressedStream.getReader();

      // Read all chunks
      const readChunks = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          collector.ondata(value);
          // Small delay to simulate processing time
          await new Promise(resolve => setTimeout(resolve, 5));
        }
      };

      await readChunks();

      // We should have received at least as many chunks as we input (evidence of proper flushing)
      // We input 3 chunks, so we should get at least 3 chunks out
      expect(collector.chunkCount).toBeGreaterThanOrEqual(3);

      // We don't test timing behavior as it can be unstable across different environments
    });

    it("should flush brotli data with BROTLI_OPERATION_FLUSH", async () => {
      // This test will run on a proper Node.js environment

      // Import the implementation directly to test it
      const { compressStream } = await import("../src/zlib/stream.js");

      // Create a stream that will emit chunks with delays
      const chunks = [
        new Uint8Array([65, 66, 67, 68]), // "ABCD"
        new Uint8Array([69, 70, 71, 72]), // "EFGH"
        new Uint8Array([73, 74, 75, 76])  // "IJKL"
      ];

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
      const compressedStream = compressStream(inputStream, "br");

      // Collect the compressed chunks
      const collector = new ChunkCollector();
      if (!compressedStream) {
        throw new Error("Expected compressStream to return a non-null stream");
      }
      const reader = compressedStream.getReader();

      // Read all chunks
      const readChunks = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          collector.ondata(value);
          // Small delay to simulate processing time
          await new Promise(resolve => setTimeout(resolve, 5));
        }
      };

      await readChunks();

      // We should have received at least as many chunks as we input (evidence of proper flushing)
      // We input 3 chunks, so we should get at least 3 chunks out
      expect(collector.chunkCount).toBeGreaterThanOrEqual(3);

      // We don't test timing behavior as it can be unstable across different environments
    });
  });
});
