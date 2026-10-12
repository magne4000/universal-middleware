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
  // With `apply()` or `pipe()`, it runs once a Response exists, after the response transforms: it compresses the body
  // as sent, an earlier middleware's answer (e.g. `sirv()`) included. Marked in place: the type `enhance()` returns
  // would put core's types, which this package bundles, in its `.d.ts`.
  enhance(middleware, { name: "compress", order: MiddlewareOrder.RESPONSE_COMPRESSION, immutable: false });
  return middleware;
}) satisfies Get<[options: CompressionOptions], UniversalMiddleware>;

// export default is mandatory
export default compressMiddleware;
