import { parse } from "regexparam";

function exec(
  path: string,
  result: {
    keys: string[];
    pattern: RegExp;
  },
) {
  let i = 0;
  const out: Record<string, string> = {};
  const matches = result.pattern.exec(path);
  if (!matches) return null;

  while (i < result.keys.length) {
    if (matches[++i]) {
      out[result.keys[i]] = matches[i];
    }
  }
  return out;
}

export function params(request: Request, path: string): null | Record<string, string> {
  const url = new URL(request.url);
  return exec(url.pathname, parse(path));
}
