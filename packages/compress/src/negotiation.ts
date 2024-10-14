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

function shouldCompress(request: Request, options?: Options, response?: Response) {
  const cacheControl = request.headers.get("Cache-Control");

  if (request.method === "HEAD") {
    return false;
  }

  // Don't compress for Cache-Control: no-transform
  // https://tools.ietf.org/html/rfc7234#section-5.2.2.4
  if (!cacheControl || !cacheControlNoTransformRegExp.test(cacheControl)) {
    return false;
  }

  if (response) {
    // content-length below threshold
    const contentLength = response.headers.get("Content-Length");
    if (contentLength && options?.threshold && Number.parseInt(contentLength, 10) < options.threshold) {
      return false;
    }

    const contentEncoding = response.headers.get("Content-Encoding") ?? "identity";
    if (contentEncoding !== "identity") {
      return false;
    }
  }

  const chosenEncoding = chooseBestEncoding(request, availableEncodings(options));

  if (!chosenEncoding || chosenEncoding === "identity") {
    return false;
  }

  return true;
}

export function negotiate(request: Request) {
  const acceptEncoding = request.headers.get("Accept-Encoding") ?? "";
  const cacheControl = request.headers.get("Cache-Control");
}
