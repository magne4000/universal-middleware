import { isCompressionStreamAvailable } from "./runtime";
import type { CompressionAlgorithm, CompressionOptions, Compressor } from "./types";

async function guessCompressor(encoding: CompressionAlgorithm): Promise<Compressor> {
  if (encoding === "br" || !isCompressionStreamAvailable) {
    const { compressStream } = await import("./zlib/stream.js");

    return (input) => compressStream(input, encoding);
  }
  const { compressStream } = await import("./stream/stream.js");

  return (input) => compressStream(input, encoding as CompressionFormat);
}

export const handleCompression = async (
  encoding: CompressionAlgorithm,
  input: Response,
  options?: CompressionOptions & ResponseInit,
): Promise<Response> => {
  // set/append Vary header with Accept-Encoding
  if (!input.headers.get("Vary")?.includes("Accept-Encoding")) input.headers.append("Vary", "Accept-Encoding");
  if (input.headers.get("Content-Encoding")) return input;

  const { headers, ...optionsRest } = options || {};
  const optionsHeaders = new Headers(headers);
  if (!optionsHeaders.get("Vary")?.includes("Accept-Encoding")) optionsHeaders.append("Vary", "Accept-Encoding");

  for (const [header, value] of optionsHeaders) {
    if (!(input.headers.get(header) ?? "").includes(value)) input.headers.append(header, value);
  }

  const compressor = await guessCompressor(encoding);
  const body = await compressor(input.body);

  if (body !== null) {
    input.headers.append("Content-Encoding", encoding);
    // delete Content-Length header because compression will invalidate it
    input.headers.delete("Content-Length");
  }

  return new Response(body, {
    headers: input.headers,
    status: optionsRest.status ?? input.status,
    statusText: optionsRest.statusText ?? input.statusText,
  });
};
