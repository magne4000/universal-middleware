import { describe, expect, it } from "vitest";
import { compressStream } from "../src/zlib/stream";

// When a client disconnects mid-response the compressed stream is cancelled.
// That cancellation has to reach the *source* stream, otherwise whatever backs
// it (a file descriptor, an upstream fetch) is stranded until GC.
//
// Same failure class as the `pipe` -> `pipeline` change in srvx#252.

describe("compressStream (zlib) :: cancellation", () => {
  it("should cancel the source stream when the compressed output is cancelled", async () => {
    let sourceCancelled = false;

    const input = new ReadableStream<Uint8Array>({
      async pull(controller) {
        controller.enqueue(new Uint8Array(1024));
        // Keep the producer from spinning while the test drives the consumer.
        await new Promise((resolve) => setTimeout(resolve, 5));
      },
      cancel() {
        sourceCancelled = true;
      },
    });

    // biome-ignore lint/style/noNonNullAssertion: input is non-null so output is too
    const output = compressStream(input, "gzip")!;
    const reader = output.getReader();
    await reader.read();
    await reader.cancel();

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(sourceCancelled).toBe(true);
  });
});
