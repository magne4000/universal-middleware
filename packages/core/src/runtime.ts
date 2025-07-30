// reference: https://github.com/honojs/hono/blob/8f1680238b1c0550049998586a414b5a1ae2012b/src/helper/adapter/index.ts
import type { Runtime } from "./types";

const knownUserAgents: Partial<Record<Runtime["runtime"], string>> = {
  deno: "Deno",
  bun: "Bun",
  workerd: "Cloudflare-Workers",
  node: "Node.js",
};

const _getRuntimeKey = (): Runtime["runtime"] => {
  // biome-ignore lint/suspicious/noExplicitAny: ignored
  const global = globalThis as any;

  // check if the current runtime supports navigator.userAgent
  const userAgentSupported = typeof navigator !== "undefined" && typeof navigator.userAgent === "string";

  // if supported, check the user agent
  if (userAgentSupported) {
    for (const [runtimeKey, userAgent] of Object.entries(knownUserAgents)) {
      if (checkUserAgentEquals(userAgent)) {
        return runtimeKey as Runtime["runtime"];
      }
    }
  }

  // check if running on Edge Runtime
  if (typeof global?.EdgeRuntime === "string") {
    return "edge-light";
  }

  // check if running on Fastly
  if (global?.fastly !== undefined) {
    return "fastly";
  }

  // userAgent isn't supported before Node v21.1.0; so fallback to the old way
  if (global?.process?.release?.name === "node") {
    return "node";
  }

  // couldn't detect the runtime
  return "other";
};

// Cache runtimekey computation
let runtimeKey: Runtime["runtime"] | undefined;
export const getRuntimeKey = (): Runtime["runtime"] => {
  if (runtimeKey === undefined) {
    runtimeKey = _getRuntimeKey();
  }
  return runtimeKey;
};

const checkUserAgentEquals = (platform: string): boolean => {
  const userAgent = navigator.userAgent;

  return userAgent.startsWith(platform);
};

export function getRuntime(args?: Omit<Runtime, "runtime">): Runtime {
  const key = getRuntimeKey();

  return {
    runtime: key,
    ...args,
  } as Runtime;
}
