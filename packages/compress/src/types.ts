export type Compression = (response: Response, request: Request, options?: ResponseInit) => Promise<Response>;
export type Compressor = (
  input: ReadableStream<Uint8Array> | null,
) => ReadableStream<Uint8Array> | null | Promise<ReadableStream<Uint8Array> | null>;
export type CompressionAlgorithm = "br" | "gzip" | "deflate";
