import type { AdapterRequestContext } from "@hattip/core";

export function createContext(request: Request, platformName: string): AdapterRequestContext {
  return {
    request,
    // TODO: Support the newer `Forwarded` standard header
    // The leftmost entry is the client: Vercel overwrites `X-Forwarded-For` at
    // its edge and does not forward external IPs, so a client cannot prepend a
    // spoofed value here. https://vercel.com/docs/headers/request-headers
    ip: (request.headers.get("x-forwarded-for") || "").split(",", 1)[0].trim(),
    waitUntil() {},
    passThrough() {},
    platform: {
      name: platformName,
    },
    env(variable) {
      return process.env[variable];
    },
  };
}
