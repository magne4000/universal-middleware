import type { Get, UniversalMiddleware } from "@universal-middleware/core";
import { EncodingGuesser } from "./compress";
import { handleCompression } from "./response";
import type { CompressionOptions } from "./types";

const compressMiddleware = ((options?: CompressionOptions) => (request) => {
  const guesser = new EncodingGuesser(request);

  return function universalMiddlewareCompress(response) {
    const encoding = guesser.guessEncoding(response);

    if (!encoding) return response;

    return handleCompression(encoding, response, options);
  };
}) satisfies Get<[options: CompressionOptions], UniversalMiddleware>;

// export default is mandatory
export default compressMiddleware;
