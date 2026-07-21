import type { IncomingHttpHeaders } from "node:http";
import { env } from "./const.js";

/** Whether the forwarding headers may be believed at all. */
export function trustsProxy(): boolean {
  return env.TRUST_PROXY === "1";
}

/**
 * The `proto`/`host` contributed by the nearest proxy.
 *
 * RFC 7239's `Forwarded` is preferred over the older `X-Forwarded-*` when
 * present. Either way the nearest proxy is the rightmost entry, since proxies
 * append and the leftmost is whatever the client sent.
 */
export function forwardedValue(headers: IncomingHttpHeaders, param: "proto" | "host"): string | undefined {
  const forwarded = headers.forwarded;
  // A trusted proxy that speaks `Forwarded` is authoritative: its element does
  // not fall through to `X-Forwarded-*`, so one cannot be used to spoof the
  // other. An absent param resolves from the connection instead.
  if (forwarded) return nearestForwardedElement(String(forwarded))[param];

  return rightmostListValue(headers[`x-forwarded-${param}`]);
}

function rightmostListValue(value: string | string[] | undefined): string | undefined {
  if (!value) return undefined;
  const hops = String(value).split(",");
  return hops[hops.length - 1].trim() || undefined;
}

/** Parses the params (RFC 7239 §4) of the nearest — rightmost — element of a `Forwarded` header. */
function nearestForwardedElement(header: string): { proto?: string; host?: string } {
  const elements = splitOutsideQuotes(header, ",");
  const nearest = elements[elements.length - 1];

  const params: { proto?: string; host?: string } = {};
  for (const pair of splitOutsideQuotes(nearest, ";")) {
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
