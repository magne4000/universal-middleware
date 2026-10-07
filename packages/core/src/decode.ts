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

export function decodeParam(value: string) {
  return value.includes("%") ? tryDecode(value, decodeURIComponent) : value;
}

export function decodeParams<T extends Record<string, string>>(params: T): T {
  const out = {} as Record<string, string>;
  for (const key in params) out[key] = decodeParam(params[key]);
  return out as T;
}
