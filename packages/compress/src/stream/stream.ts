export function compressStream(
  input: ReadableStream<Uint8Array> | null,
  algorithm: CompressionFormat,
): ReadableStream<Uint8Array> | null {
  if (input === null) {
    return input;
  }

  const compressionStream = new CompressionStream(algorithm);

  return input.pipeThrough(compressionStream);
}
