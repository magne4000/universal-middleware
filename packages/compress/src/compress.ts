import { COMPRESSIBLE_CONTENT_TYPE_REGEX, SUPPORTED_ENCODINGS } from "./const";
import { chooseBestEncoding } from "./encoding-header";
import type { CompressionOptions } from "./types";

type SupportedEncodings = (typeof SUPPORTED_ENCODINGS)[number];

const cacheControlNoTransformRegExp = /(?:^|,)\s*?no-transform\s*?(?:,|$)/i;

export class EncodingGuesser {
  public readonly encoding: SupportedEncodings | null;

  constructor(
    private request: Request,
    private options: CompressionOptions = {},
  ) {
    this.encoding = this._guessRequest();
  }

  private _guessRequest() {
    if (this.request.method === "HEAD") {
      return null;
    }

    // Don't compress for Cache-Control: no-transform
    // https://tools.ietf.org/html/rfc7234#section-5.2.2.4
    const cacheControl = this.request.headers.get("Cache-Control");
    if (cacheControl && cacheControlNoTransformRegExp.test(cacheControl)) {
      return null;
    }

    const chosenEncoding = chooseBestEncoding(this.request, SUPPORTED_ENCODINGS);

    if (!chosenEncoding || chosenEncoding === "identity") {
      return null;
    }

    return chosenEncoding as SupportedEncodings;
  }

  guessEncoding(response: Response) {
    if (this.encoding === null) return null;
    const threshold = this.options?.threshold ?? 1024;

    const cacheControl = response.headers.get("Cache-Control");
    if (cacheControl && cacheControlNoTransformRegExp.test(cacheControl)) {
      return null;
    }

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

    return this.encoding;
  }
}
