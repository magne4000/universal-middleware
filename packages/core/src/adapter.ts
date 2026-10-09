import type { ServerRequest as SrvxRequest } from "srvx";
import { getRuntimeKey } from "./runtime";
import type { Adapter, Runtime, RuntimeAdapter } from "./types";

export function getAdapterRuntime<K extends Adapter["adapter"]>(
  adapter: K,
  adapterArgs: Omit<Extract<Adapter, { adapter: K }>, "adapter">,
  runtimeArgs?: Omit<Runtime, "runtime">,
  request?: SrvxRequest,
): RuntimeAdapter {
  // Built for each middleware of each request: one object, without intermediate ones
  const node = request?.runtime?.node;
  return {
    runtime: getRuntimeKey(),
    ...runtimeArgs,
    adapter,
    ...adapterArgs,
    // srvx keeps the Node request and response on its request
    ...(node?.req && { req: node.req }),
    ...(node?.res && { res: node.res }),
  } as RuntimeAdapter;
}
