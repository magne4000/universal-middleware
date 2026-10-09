import { describe, it } from "vitest";
import { compressStream } from "../src/zlib/stream";

// When a client disconnects mid-response the compressed stream is cancelled.
// That cancellation has to reach the *source* stream, otherwise whatever backs
// it (a file descriptor, an upstream fetch) is stranded until GC.
//
// Same failure class as the `pipe` -> `pipeline` change in srvx#252.

describe("compressStream (zlib) :: cancellation", () => {
  it("should cancel the source stream when the compressed output is cancelled", async () => {
    const sourceCancelled = Promise.withResolvers<void>();

    // One chunk (zlib flushes it, so the output has something to read), then the source stays open:
    // only a cancellation can end it
    const input = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(1024));
      },
      cancel() {
        sourceCancelled.resolve();
      },
    });

    // biome-ignore lint/style/noNonNullAssertion: input is non-null so output is too
    const output = compressStream(input, "gzip")!;
    const reader = output.getReader();
    await reader.read();
    await reader.cancel();

    // Times out if the cancellation never reaches the source
    await sourceCancelled.promise;
  });
});
