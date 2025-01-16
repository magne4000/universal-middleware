import { getRuntime } from "./runtime";
import type { Adapter, Runtime } from "./types";

export function getAdapter<K extends Adapter["adapter"]>(
  key: K,
  args: Omit<Extract<Adapter, { adapter: K }>, "adapter">,
): Adapter {
  return {
    adapter: key,
    ...args,
  } as Adapter;
}

export function getAdapterRuntime<K extends Adapter["adapter"]>(
  adapter: K,
  adapterArgs: Omit<Extract<Adapter, { adapter: K }>, "adapter">,
  runtimeArgs?: Omit<Runtime, "runtime">,
) {
  const a = getAdapter(adapter, adapterArgs);
  const r = getRuntime(runtimeArgs);

  return { ...r, ...a };
}
