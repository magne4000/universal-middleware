export type Compressor = (
  input: ReadableStream<Uint8Array> | null,
) => ReadableStream<Uint8Array> | null | Promise<ReadableStream<Uint8Array> | null>;
export type CompressionAlgorithm = "br" | "gzip" | "deflate";
export interface CompressionOptions extends ResponseInit {
  compressionMethod?: "auto" | "zlib" | "stream";
}
