// Decode paths and parameters the way Hono does (hono/utils/url): `decodeURI` keeps reserved characters such as `%2F`
// encoded, `%25` is kept as is so a path is never decoded twice, and a malformed encoding only keeps the
// escape run that fails to decode (`/%64ash/%zz` becomes `/dash/%zz`).
function tryDecode(str: string, decoder: (str: string) => string) {
  try {
    return decoder(str);
  } catch {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match) => {
      try {
        return decoder(match);
      } catch {
        return match;
      }
    });
  }
}

export function decodePath(path: string) {
  if (!path.includes("%")) return path;
  return tryDecode(path.replace(/%25/g, "%2525"), decodeURI);
}

// rou3 percent-encodes the literal text of a route pattern (`/café` is stored as `/caf%C3%A9`) and compares lookup
// paths as given. Encoding a decoded pathname with the same character set as rou3's `encodeLiteral` gives the form
// routes are stored in. `%` is never encoded, so the escapes `decodePath` keeps (`%2F`, `%25`) stay as they are.
export function encodePath(path: string) {
  return path.replace(/[\0- "#<>?^`{}\x7F-\uFFFC]+/g, encodeURIComponent);
}

// Puts a route pattern in the form `encodePath(decodePath(pathname))` gives a request path. Only the `%XX` runs are
// decoded: what rou3 encodes is encoded back, and what rou3 reads as pattern syntax is escaped, so an encoded character
// stays a literal one (`%2A` is a `*`, not a wildcard, and `%09` does not become a raw tab).
export function decodePattern(pattern: string) {
  if (!pattern.includes("%")) return pattern;
  return pattern.replace(/(?:%[0-9A-Fa-f]{2})+/g, (run) => encodePath(decodePath(run)).replace(/[()*\\]/g, "\\$&"));
}

export function decodeParam(value: string) {
  return value.includes("%") ? tryDecode(value, decodeURIComponent) : value;
}

export function decodeParams<T extends Record<string, string>>(params: T): T {
  const out = {} as Record<string, string>;
  for (const key in params) out[key] = decodeParam(params[key]);
  return out as T;
}
