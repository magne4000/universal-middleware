import type { AdapterRequestContext } from "@hattip/core";

export function createContext(request: Request, platformName: string): AdapterRequestContext {
  return {
    request,
    // TODO: Support the newer `Forwarded` standard header
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
