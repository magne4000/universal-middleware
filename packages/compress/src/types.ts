export type Compressor = (
  input: ReadableStream<Uint8Array> | null,
) => ReadableStream<Uint8Array> | null | Promise<ReadableStream<Uint8Array> | null>;
export type CompressionAlgorithm = "br" | "gzip" | "deflate" | "deflate-raw";
export interface CompressionOptions {
  threshold?: number;
}
export type SupportedEncodings = CompressionAlgorithm[];
