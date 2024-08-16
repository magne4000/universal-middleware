import type { UniversalRequest } from "./types.js";
import { uContext } from "./const.js";

export function getContext<T extends object>(request: UniversalRequest<T>): T {
  request[uContext] ??= {} as T;
  return request[uContext];
}

export function setContext<T extends object, K extends keyof T>(
  request: UniversalRequest<T>,
  key: NoInfer<K>,
  value: NoInfer<T>[K],
): void {
  request[uContext] ??= {} as T;
  request[uContext][key] = value;
}

export function deleteContext<T extends object>(
  request: UniversalRequest<T>,
  key: keyof NoInfer<T>,
): void {
  request[uContext] ??= {} as T;
  delete request[uContext][key];
}
