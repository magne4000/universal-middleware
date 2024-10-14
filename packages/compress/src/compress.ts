import { COMPRESSIBLE_CONTENT_TYPE_REGEX } from "./const";
import { chooseBestEncoding } from "./encoding-header";

const cacheControlNoTransformRegExp = /(?:^|,)\s*?no-transform\s*?(?:,|$)/;
let zlibAvailable = false;

import("node:zlib")
  .then(() => {
    zlibAvailable = true;
  })
  .catch(() => {
    zlibAvailable = false;
  });

interface Options {
  threshold: number;
  compressionMethod?: "auto" | "zlib" | "stream";
}

function availableEncodings(options?: Options) {
  if (zlibAvailable && options?.compressionMethod !== "stream") {
    return ["br", "gzip", "deflate"];
  }
  return ["gzip", "deflate"];
}

export function compressEncoding(request: Request, options?: Options, response?: Response) {
  const cacheControl = request.headers.get("Cache-Control");
  const threshold = options?.threshold ?? 1024;

  if (request.method === "HEAD") {
    return null;
  }

  // Don't compress for Cache-Control: no-transform
  // https://tools.ietf.org/html/rfc7234#section-5.2.2.4
  if (!cacheControl || !cacheControlNoTransformRegExp.test(cacheControl)) {
    return null;
  }

  if (response) {
    // content-length below threshold
    const contentLength = response.headers.get("Content-Length");
    if (contentLength && Number.parseInt(contentLength, 10) < threshold) {
      return null;
    }

    const contentType = response.headers.get("Content-Type");
    if (!contentType || !COMPRESSIBLE_CONTENT_TYPE_REGEX.test(contentType)) {
      return null;
    }

    // already encoded
    const contentEncoding = response.headers.get("Content-Encoding") ?? "identity";
    if (contentEncoding !== "identity") {
      return null;
    }
  }

  const chosenEncoding = chooseBestEncoding(request, availableEncodings(options));

  if (!chosenEncoding || chosenEncoding === "identity") {
    return null;
  }

  return chosenEncoding;
}
