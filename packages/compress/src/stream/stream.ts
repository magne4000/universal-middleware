import { Gzip, Deflate, Zlib } from "fflate";

export function compressStream(
  input: ReadableStream<Uint8Array> | null,
  algorithm: CompressionFormat,
): ReadableStream<Uint8Array> | null {
  if (input === null) {
    return input;
  }

  let compressor: Gzip | Deflate | Zlib;
  let isCancelled = false;

  switch (algorithm as string) {
    case "gzip":
      compressor = new Gzip();
      break;
    case "deflate":
      compressor = new Zlib();
      break;
    case "deflate-raw":
      compressor = new Deflate();
      break;
    default:
      throw new Error(`{ compressionMethod: "stream" } does not support "${algorithm}" encoding`);
  }

  const transformStream = new TransformStream({
    start(controller) {
      compressor.ondata = (chunk, final) => {
        try {
          if (!isCancelled) {
            controller.enqueue(chunk);
          }
        } catch (err) {
          controller.error(err);
        }
      };
    },
    transform(chunk, controller) {
      try {
        if (!isCancelled) {
          compressor.push(chunk, false);
          compressor.flush();
        }
      } catch (err) {
        controller.error(err);
      }
    },
    flush(controller) {
      try {
        if (!isCancelled) {
          compressor.push(new Uint8Array(), true);
        }
      } catch (err) {
        controller.error(err);
      }
    },
    // Missing types for https://streams.spec.whatwg.org/#dom-transformer-cancel
    // @ts-expect-error
    cancel() {
      isCancelled = true;
    },
  });

  return input.pipeThrough(transformStream);
}
