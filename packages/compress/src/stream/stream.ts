export function compressStream(
  input: ReadableStream<Uint8Array> | null,
  algorithm: CompressionFormat,
): ReadableStream<Uint8Array> | null {
  if (input === null) {
    return input;
  }

  if ((algorithm as string) === "br") {
    throw new Error(`{ compressionMethod: "stream" } does not support "br" encoding`);
  }

  const compressionStream = new CompressionStream(algorithm);

  return input.pipeThrough(compressionStream);
}
