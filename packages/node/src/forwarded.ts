import type { IncomingHttpHeaders } from "node:http";
import { env } from "./const.js";

/** Whether the `TRUST_PROXY` env var lets the forwarding headers be believed */
export function trustsProxy(): boolean {
  return env.TRUST_PROXY === "1";
}

/**
 * The client-facing `proto`/`host`: the first value, as Express's `trust proxy` reads it.
 * `X-Forwarded-*` wins, and RFC 7239's `Forwarded` fills what it omits: a client's `Forwarded`, passed through by a
 * proxy that sets only `X-Forwarded-*`, can't override that proxy.
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
