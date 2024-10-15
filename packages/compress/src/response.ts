import type { SUPPORTED_ENCODINGS } from "./const";
import { compressStream } from "./stream/stream";
import type { CompressionOptions } from "./types";

// async function guessCompressor(
//   compressionMethod: CompressionOptions["compressionMethod"],
//   encoding: (typeof SUPPORTED_ENCODINGS)[number],
// ): Promise<Compressor> {
//   if (compressionMethod === "auto" || !compressionMethod) {
//     // biome-ignore lint/style/noParameterAssign: <explanation>
//     compressionMethod = encoding === "br" ? "zlib" : "stream";
//   }
//   if (compressionMethod === "zlib") {
//     const { compressStream } = await import("./zlib/stream.js");
//
//     return (input) => compressStream(input, encoding);
//   }
//   if (compressionMethod === "stream") {
//     const { compressStream } = await import("./stream/stream.js");
//
//     return (input) => compressStream(input, encoding as CompressionFormat);
//   }
//   throw new Error('Unsupported compressionMethod. Possible values are "auto", "zlib" or "stream".');
// }

export const handleCompression = async (
  encoding: (typeof SUPPORTED_ENCODINGS)[number],
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

  const body = compressStream(input.body, encoding);

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
