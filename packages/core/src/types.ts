import type { IncomingMessage, ServerResponse } from "node:http";
import type { EventContext as CloudflarePagesContext } from "@cloudflare/workers-types";
import type { AdapterRequestContext as HattipContext } from "@hattip/core";
import type { RequestCtx as WebrouteContext } from "@webroute/route";
import type { Server as BunServer } from "bun";
import type { Context as ElysiaContext } from "elysia";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { H3Event } from "h3";
import type { Context as HonoContext } from "hono";
import {
  contextSymbol,
  type methodSymbol,
  type MiddlewareOrder,
  type nameSymbol,
  type optionsToSymbols,
  type orderSymbol,
  type pathSymbol,
  type universalSymbol,
} from "./const"; // Helpers

// Helpers

export type Awaitable<T> = T | Promise<T>;

export type AnyFn = (...args: any[]) => any;

export type SetThis<F extends AnyFn, This> = (this: This, ...args: Parameters<OmitThisParameter<F>>) => ReturnType<F>;

export type UniversalFn<U extends UniversalHandler<any> | UniversalMiddleware<any, any>, F extends AnyFn> = F & {
  [universalSymbol]: U;
};

export type SetThisHandler<F extends AnyFn, U extends UniversalHandler<any> = UniversalHandler> = SetThis<
  UniversalFn<U, F>,
  { [universalSymbol]: U }
>;
export type SetThisMiddleware<F extends AnyFn, U extends UniversalMiddleware<any, any> = UniversalMiddleware> = SetThis<
  UniversalFn<U, F>,
  { [universalSymbol]: U }
>;

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

export interface ExpressAdapter {
  adapter: "express";
  params: Record<string, string> | undefined;

  req: IncomingMessage;
  res: ServerResponse;

  express: {
    req: IncomingMessage;
    res: ServerResponse;
  };
}

export interface FastifyAdapter {
  adapter: "fastify";
  params: Record<string, string> | undefined;

  req: IncomingMessage;
  res: ServerResponse;

  fastify: {
    request: FastifyRequest;
    reply: FastifyReply;
  };
}

export interface HonoAdapter {
  adapter: "hono";
  params: Record<string, string> | undefined;

  req?: IncomingMessage;
  res?: ServerResponse;

  hono: HonoContext;
}

export interface HattipAdapter {
  adapter: "hattip";
  params: Record<string, string> | undefined;

  req?: IncomingMessage;
  res?: ServerResponse;

  hattip: HattipContext;
}

export interface H3Adapter {
  adapter: "h3";
  params: Record<string, string> | undefined;

  req?: IncomingMessage;
  res?: ServerResponse;

  h3: H3Event;
}

export interface CloudflarePagesAdapter {
  adapter: "cloudflare-pages";
  params: Record<string, string> | undefined;

  "cloudflare-pages": CloudflarePagesContext<Record<string | number | symbol, unknown>, any, Record<string, unknown>>;
}

export interface CloudflareWorkerAdapter {
  adapter: "cloudflare-worker";
  params: undefined;

  "cloudflare-worker": Omit<CloudflareWorkerdRuntime, "runtime">;
}

export interface VercelEdgeAdapter {
  adapter: "vercel-edge";
  params: Record<string, string> | undefined;
}

export interface VercelNodeAdapter {
  adapter: "vercel-node";
  params: Record<string, string> | undefined;

  "vercel-node": {
    req: IncomingMessage;
    res: ServerResponse;
  };
}

export interface ElysiaAdapter {
  adapter: "elysia";
  params: Record<string, string> | undefined;

  elysia: ElysiaContext;
}

export interface WebrouteAdapter {
  adapter: "webroute";
  params: Record<string, string> | undefined;

  webroute?: WebrouteContext;
}

export interface OtherAdapter {
  adapter: "other";
  params: undefined;
}

export type Adapter =
  | ExpressAdapter
  | FastifyAdapter
  | HonoAdapter
  | HattipAdapter
  | H3Adapter
  | CloudflarePagesAdapter
  | CloudflareWorkerAdapter
  | VercelEdgeAdapter
  | VercelNodeAdapter
  | ElysiaAdapter
  | WebrouteAdapter
  | OtherAdapter;
export type RuntimeAdapter = Runtime & Adapter;
export type RuntimeAdapterTarget<T> = T extends string ? Runtime & Extract<Adapter, { adapter: T }> : RuntimeAdapter;
export type Adapters = Adapter["adapter"];
export type Runtimes = Runtime["runtime"];

export type UniversalMiddleware<
  InContext extends Universal.Context = Universal.Context,
  OutContext extends Universal.Context = Universal.Context,
  Target = unknown,
> = (
  request: Request,
  context: InContext,
  runtime: RuntimeAdapterTarget<Target>,
  // biome-ignore lint/suspicious/noConfusingVoidType: <explanation>
) => Awaitable<Response | OutContext | ((response: Response) => Awaitable<Response | undefined>) | void | undefined>;

export type UniversalHandler<InContext extends Universal.Context = Universal.Context, Target = unknown> = (
  request: Request,
  context: InContext,
  runtime: RuntimeAdapterTarget<Target>,
) => Awaitable<Response>;

export type Get<T extends unknown[], U> = (...args: T) => U;

// Router

export interface UniversalSymbols {
  [nameSymbol]: string;
  [methodSymbol]: HttpMethod | HttpMethod[];
  [pathSymbol]: string;
  [orderSymbol]: MiddlewareOrder | number;
  [contextSymbol]?: Universal.Context | undefined;
}

type OptionsToSymbols = typeof optionsToSymbols;

export type UniversalOptions = {
  [K in keyof OptionsToSymbols]: UniversalSymbols[OptionsToSymbols[K]];
};

export interface UniversalOptionsArg extends Partial<UniversalOptions> {
  /**
   * @default true
   */
  immutable?: boolean;
}

export type WithUniversalSymbols<T extends UniversalOptionsArg> = Pick<
  UniversalSymbols,
  OptionsToSymbols[keyof T & keyof OptionsToSymbols]
>;

// https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods
export type HttpMethod = "GET" | "HEAD" | "POST" | "PUT" | "DELETE" | "CONNECT" | "OPTIONS" | "TRACE" | "PATCH";
export type Enhance<T> = T & Partial<UniversalSymbols>;

export type EnhancedMiddleware =
  | Enhance<UniversalMiddleware>
  | { [universalSymbol]: Enhance<UniversalMiddleware> }
  | (Enhance<AnyFn> & { [universalSymbol]: UniversalMiddleware });

export interface UniversalRouterInterface<T extends "sync" | "async" = "sync"> {
  use(middleware: EnhancedMiddleware): T extends "async" ? this | Promise<this> : this;
  route(handler: EnhancedMiddleware): T extends "async" ? this | Promise<this> : this;
  applyCatchAll(): T extends "async" ? this | Promise<this> : this;
}
