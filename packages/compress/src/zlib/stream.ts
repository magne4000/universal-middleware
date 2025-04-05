import {
  constants,
  type BrotliCompress,
  type Deflate,
  type Gzip,
  createBrotliCompress,
  createDeflate,
  createGzip,
} from "node:zlib";
import type { CompressionAlgorithm } from "../types";

const algorithms = {
  br: createBrotliCompress,
  gzip: createGzip,
  deflate: createDeflate,
} as const;

const defaultOptions = {
  br: { flush: constants.BROTLI_OPERATION_PROCESS, params: { [constants.BROTLI_PARAM_QUALITY]: 4 } },
  gzip: { flush: constants.Z_SYNC_FLUSH },
  deflate: { flush: constants.Z_SYNC_FLUSH },
} as const;

export function compressStream<C extends CompressionAlgorithm, O extends Parameters<(typeof algorithms)[C]>[0]>(
  input: ReadableStream<Uint8Array> | null,
  algorithm: CompressionAlgorithm,
  options?: O,
): ReadableStream<Uint8Array> | null {
  if (input === null) {
    return input;
  }

  const compressionStream: BrotliCompress | Gzip | Deflate = algorithms[algorithm]({
    ...defaultOptions[algorithm],
    ...options,
  });
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = input.getReader();

      // Feed the compression stream manually with Uint8Array chunks
      compressionStream.on("data", (chunk: Buffer) => {
        controller.enqueue(new Uint8Array(chunk));
      });

      compressionStream.on("end", () => {
        controller.close();
      });

      compressionStream.on("error", (err) => {
        controller.error(err);
      });

      // Read the original input stream, write to the compression stream
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            compressionStream.end();
            break;
          }

          // Write the current chunk to the compression stream
          compressionStream.write(value);
        }
      } catch (err) {
        controller.error(err);
      }
    },
  });
}
