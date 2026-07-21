import type { IncomingHttpHeaders } from "node:http";
import { env } from "./const.js";

/** Whether `X-Forwarded-*` may be believed at all. */
export function trustsProxy(): boolean {
  return env.TRUST_PROXY === "1";
}

// TODO: Support the newer `Forwarded` standard header
/**
 * The `X-Forwarded-<name>` value contributed by the nearest proxy — the rightmost
 * entry, since proxies append and the leftmost is whatever the client sent.
 */
export function forwardedValue(headers: IncomingHttpHeaders, name: string): string | undefined {
  const value = headers[`x-forwarded-${name}`];
  if (!value) return undefined;

  const hops = String(value).split(",");
  return hops[hops.length - 1].trim() || undefined;
}
