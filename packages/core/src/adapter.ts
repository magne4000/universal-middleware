import type { ServerRequest as SrvxRequest } from "srvx";
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
  request?: SrvxRequest,
) {
  const a = getAdapter(adapter, adapterArgs);
  const r = getRuntime(runtimeArgs);
  const s: object = getSrvxNodeRuntime(request);

  return { ...r, ...a, ...s };
}

function getSrvxNodeRuntime(request?: SrvxRequest) {
  const ret: { req?: unknown; res?: unknown } = {};
  if (request?.runtime?.node?.req) ret.req = request?.runtime.node.req;
  if (request?.runtime?.node?.res) ret.res = request?.runtime.node.res;
  return ret;
}
