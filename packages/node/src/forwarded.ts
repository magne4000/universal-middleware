import type { IncomingHttpHeaders } from "node:http";
import { env } from "./const.js";

/** Whether the forwarding headers may be believed at all. */
export function trustsProxy(): boolean {
  return env.TRUST_PROXY === "1";
}

/**
 * The client-facing `proto`/`host`, matching Express's `trust proxy`: the first
 * value, which is the original the client reached. `trustProxy` asserts the proxy
 * sets these headers, overwriting any client-supplied one.
 *
 * `X-Forwarded-*` wins; RFC 7239's `Forwarded` fills a param the legacy header
 * omits, so a client `Forwarded` passed through by a legacy proxy cannot override
 * what that proxy set.
 */
export function forwardedValue(headers: IncomingHttpHeaders, param: "proto" | "host"): string | undefined {
  return firstListValue(headers[`x-forwarded-${param}`]) ?? firstForwardedElement(headers.forwarded)[param];
}

function firstListValue(value: string | string[] | undefined): string | undefined {
  if (!value) return undefined;
  return String(value).split(",", 1)[0].trim() || undefined;
}

/** Parses the params (RFC 7239 §4) of the first element of a `Forwarded` header. */
function firstForwardedElement(header: string | string[] | undefined): { proto?: string; host?: string } {
  const params: { proto?: string; host?: string } = {};
  if (!header) return params;

  const [first] = splitOutsideQuotes(String(header), ",");
  for (const pair of splitOutsideQuotes(first, ";")) {
    const eq = pair.indexOf("=");
    if (eq === -1) continue;
    const name = pair.slice(0, eq).trim().toLowerCase();
    if (name === "proto" || name === "host") {
      params[name] = unquote(pair.slice(eq + 1).trim()) || undefined;
    }
  }
  return params;
}

/** Splits on `separator`, ignoring occurrences inside a quoted-string (where an IPv6 `for` may sit). */
function splitOutsideQuotes(value: string, separator: string): string[] {
  const parts: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < value.length; i++) {
    const char = value[i];
    if (quoted && char === "\\") {
      current += char + (value[++i] ?? "");
    } else if (char === '"') {
      quoted = !quoted;
      current += char;
    } else if (char === separator && !quoted) {
      parts.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  parts.push(current);
  return parts;
}

function unquote(value: string): string {
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1).replace(/\\(.)/g, "$1");
  }
  return value;
}
