import type { IncomingMessage, ServerResponse } from "node:http";
import type { Server as BunServer } from "bun";

export type Awaitable<T> = T | Promise<T>;

// Runtimes

export interface CloudflareWorkerdRuntime<Env extends Record<string, any> = Record<string, unknown>> {
  runtime: "workerd";

  /**
   * @see {@link https://developers.cloudflare.com/workers/runtime-apis/bindings/}
   */
  env?: Env;
  /**
   * @see {@link https://developers.cloudflare.com/workers/runtime-apis/context/}
   */
  ctx?: {
    /**
     * @see {@link https://developers.cloudflare.com/workers/runtime-apis/context/#waituntil}
     */
    waitUntil?: (promise: Promise<any>) => void;
    /**
     * @see {@link https://developers.cloudflare.com/workers/runtime-apis/context/#passthroughonexception}
     */
    passThroughOnException?: () => void;
  };
}

export interface DenoRuntime {
  runtime: "deno";
}

export interface NodeRuntime {
  runtime: "node";
}

export interface BunRuntime {
  runtime: "bun";

  server: BunServer;
}

export interface VercelEdgeRuntime {
  runtime: "edge-light";
}

export interface FastlyRuntime {
  runtime: "fastly";
}

export interface OtherRuntime {
  runtime: "other";
}

/**
 * Inspired by Runtime Keys proposal
 * @see {@link https://runtime-keys.proposal.wintercg.org/}
 */
export type Runtime =
  | CloudflareWorkerdRuntime
  | DenoRuntime
  | NodeRuntime
  | BunRuntime
  | VercelEdgeRuntime
  | FastlyRuntime
  | OtherRuntime;

// Adapters

export interface NodeAdapter {
  adapter: "node";

  req: IncomingMessage;
  res: ServerResponse;
}

export interface OtherAdapter {
  adapter: "other";
}

export type Adapter = NodeAdapter | OtherAdapter;
export type RuntimeAdapter = Runtime & Adapter;

export type UniversalMiddleware<
  InContext extends Universal.Context = Universal.Context,
  OutContext extends Universal.Context = Universal.Context,
> = (
  request: Request,
  context: InContext,
  runtime: RuntimeAdapter,
  // biome-ignore lint/suspicious/noConfusingVoidType: <explanation>
) => Awaitable<Response | OutContext | ((response: Response) => Awaitable<Response>) | void | undefined>;

export type UniversalHandler<InContext extends Universal.Context = Universal.Context> = (
  request: Request,
  context: InContext,
  runtime: RuntimeAdapter,
) => Awaitable<Response>;

export type Get<T extends unknown[], U> = (...args: T) => U;
