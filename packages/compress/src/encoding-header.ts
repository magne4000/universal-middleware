const simpleEncodingRegExp = /^\s*([^\s;]+)\s*(?:;(.*))?$/;

interface AcceptEncoding {
  encoding: string;
  q: number;
  index: number;
}

function parseAcceptEncodingHeader(accept: string): Map<string, AcceptEncoding> {
  const accepts = accept.split(",");
  const out = new Map<string, AcceptEncoding>();
  let minQuality = 1;

  for (let i = 0; i < accepts.length; i++) {
    const encoding = parseEncoding(accepts[i].trim());

    if (encoding) {
      out.set(encoding.encoding, {
        ...encoding,
        index: i,
      });
      minQuality = Math.min(minQuality, encoding.q || 1);
    }
  }

  if (!out.has("identity")) {
    /*
     * If identity doesn't explicitly appear in the accept-encoding header,
     * it's added to the list of acceptable encoding with the lowest q
     */
    out.set("identity", {
      encoding: "identity",
      q: minQuality,
      index: Number.MAX_SAFE_INTEGER,
    });
  }

  return out;
}

function parseEncoding(str: string) {
  const match = simpleEncodingRegExp.exec(str);
  if (!match) return null;

  const encoding = match[1];
  let q = 1;
  if (match[2]) {
    const params = match[2].split(";");
    for (let j = 0; j < params.length; j++) {
      const p = params[j].trim().split("=");
      if (p[0] === "q") {
        q = Number.parseFloat(p[1]);
        break;
      }
    }
  }

  return {
    encoding: encoding,
    q: q,
  };
}

export function chooseBestEncoding(request: Request, availableEncodings: readonly string[]) {
  if (availableEncodings.length === 0) return null;

  const header = request.headers.get("Accept-Encoding");
  if (!header) return null;

  const parsed = parseAcceptEncodingHeader(header);
  // RFC 9110 §12.5.3: "*" stands for every coding the header does not name.
  const wildcard = parsed.get("*");

  let bestEncoding: AcceptEncoding | null = null;
  for (const encoding of availableEncodings) {
    const match = parsed.get(encoding) ?? wildcard;
    // A qvalue of 0 means "not acceptable".
    if (!match || match.q <= 0) continue;

    const candidate = { encoding, q: match.q, index: match.index };
    if (
      !bestEncoding ||
      candidate.q > bestEncoding.q ||
      (candidate.q === bestEncoding.q && candidate.index < bestEncoding.index)
    ) {
      bestEncoding = candidate;
    }
  }

  return bestEncoding?.encoding;
}
