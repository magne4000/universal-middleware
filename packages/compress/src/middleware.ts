import { enhance, type Get, MiddlewareOrder, type UniversalMiddleware } from "@universal-middleware/core";
import { EncodingGuesser } from "./compress";
import { handleCompression } from "./response";
import type { CompressionOptions } from "./types";

const compressMiddleware = ((options?: CompressionOptions) => {
  const middleware = (request: Request) => {
    const guesser = new EncodingGuesser(request, options);

    return function universalMiddlewareCompress(response: Response) {
      const encoding = guesser.guessEncoding(response);

      if (!encoding) return response;

      return handleCompression(encoding, response, options);
    };
  };
  // `apply()` runs it after the response transforms, so it compresses the final body. Marked in place: the type
  // `enhance()` returns would put core's types in this package's `.d.ts`.
  enhance(middleware, { name: "compress", order: MiddlewareOrder.RESPONSE_COMPRESSION, immutable: false });
  return middleware;
}) satisfies Get<[options: CompressionOptions], UniversalMiddleware>;

// export default is mandatory
export default compressMiddleware;
