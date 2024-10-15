import type { Get, UniversalMiddleware } from "@universal-middleware/core";
import { EncodingGuesser } from "./compress";
import { handleCompression } from "./response";
import type { CompressionOptions } from "./types";

const compressMiddleware = ((options?: CompressionOptions) => (request) => {
  const guesser = new EncodingGuesser(request);

  return async (response) => {
    const encoding = guesser.guessEncoding(response);

    if (!encoding) return response;

    const newRes = await handleCompression(encoding, response, options);

    console.log("HEADERS", newRes.headers);

    return newRes;
  };
}) satisfies Get<[options: CompressionOptions], UniversalMiddleware>;

// export default is mandatory
export default compressMiddleware;
