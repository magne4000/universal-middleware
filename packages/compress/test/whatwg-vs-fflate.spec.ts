import { describe, expect, it, vi } from "vitest";
import * as runtime from "../src/runtime";

// These tests require CompressionStream to be available

// Helper to create a stream that emits chunks with delays
function createDelayedChunkStream(chunks: Uint8Array[], delayMs = 10) {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(chunk);
        // Wait between chunks
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
      controller.close();
    },
  });
}

// Helper to collect chunks from a stream
async function collectChunksWithTimestamps(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    // Small delay to simulate processing
    await new Promise((resolve) => setTimeout(resolve, 5));
  }

  return { chunks };
}

describe("WHATWG CompressionStream vs fflate", () => {
  // These tests will run on environments with CompressionStream available

  it("should demonstrate WHATWG CompressionStream flush limitation", async () => {
    // Create test data
    const encoder = new TextEncoder();
    const chunks = [
      encoder.encode("This is chunk one."),
      encoder.encode("This is chunk two."),
      encoder.encode("This is chunk three."),
    ];

    // Create a stream with delayed chunks
    const inputStream = createDelayedChunkStream(chunks, 50);

    // Use WHATWG CompressionStream
    const compressedStream = inputStream.pipeThrough(
      new CompressionStream("gzip")
    );

    // Collect compressed chunks
    const { chunks: compressedChunks } =
      await collectChunksWithTimestamps(compressedStream);

    // WHATWG CompressionStream typically buffers and doesn't flush until the end
    // So we expect fewer chunks than we input, often just 1 or 2
    expect(compressedChunks.length).toBeLessThan(chunks.length);

    // We don't test timing behavior as it can be unstable across different environments
  });

  it("should demonstrate fflate's proper flush behavior", async () => {
    // Force use of fflate
    vi.spyOn(runtime, "isZlibAvailable", "get").mockReturnValue(false);

    // Import the implementation directly
    const { compressStream } = await import("../src/stream/stream.js");

    // Create test data
    const encoder = new TextEncoder();
    const chunks = [
      encoder.encode("This is chunk one."),
      encoder.encode("This is chunk two."),
      encoder.encode("This is chunk three."),
    ];

    // Create a stream with delayed chunks
    const inputStream = createDelayedChunkStream(chunks, 50);

    // Use fflate via our compressStream
    const compressedStream = compressStream(inputStream, "gzip");

    // Collect compressed chunks
    if (!compressedStream) {
      throw new Error("Expected compressStream to return a non-null stream");
    }
    const { chunks: compressedChunks } =
      await collectChunksWithTimestamps(compressedStream);

    // fflate should produce at least as many chunks as we input due to proper flushing
    // It may produce more chunks due to internal buffering and flushing behavior
    expect(compressedChunks.length).toBeGreaterThanOrEqual(chunks.length);

    // We don't test timing behavior as it can be unstable across different environments
  });

  it("should demonstrate that fflate produces properly decompressible chunks", async () => {
    // Force use of fflate
    vi.spyOn(runtime, "isZlibAvailable", "get").mockReturnValue(false);

    // Import the implementation directly
    const { compressStream } = await import("../src/stream/stream.js");

    // Create test data
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const testString = "This is a test string that will be compressed.";
    const inputData = encoder.encode(testString);

    // Create a simple stream with a single chunk
    const inputStream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(inputData);
        controller.close();
      },
    });

    // Compress with fflate
    const compressedStream = compressStream(inputStream, "gzip");

    // Decompress with WHATWG DecompressionStream
    if (!compressedStream) {
      throw new Error("Expected compressStream to return a non-null stream");
    }
    const decompressedStream = compressedStream.pipeThrough(
      new DecompressionStream("gzip")
    );

    // Read the decompressed data
    const reader = decompressedStream.getReader();
    const chunks: Uint8Array[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    // Combine chunks and convert to string
    const combinedChunks = new Uint8Array(
      chunks.reduce((acc, chunk) => acc + chunk.length, 0)
    );

    let offset = 0;
    for (const chunk of chunks) {
      combinedChunks.set(chunk, offset);
      offset += chunk.length;
    }

    const decompressedString = decoder.decode(combinedChunks);

    // The decompressed string should match the original
    expect(decompressedString).toBe(testString);
  });
});
