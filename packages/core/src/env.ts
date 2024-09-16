import type { CloudflareWorkerdRuntime, RuntimeAdapter } from "./types";

export function env<T extends Record<string, unknown>>(runtime: RuntimeAdapter): T {
  switch (runtime.runtime) {
    case "bun":
    case "node":
    case "edge-light":
      return globalThis?.process?.env as T;
    case "deno":
      // @ts-ignore
      return Deno.env.toObject() as T;
    case "workerd":
      return ((runtime as CloudflareWorkerdRuntime).env ?? {}) as T;
    default:
      return {} as T;
  }
}
