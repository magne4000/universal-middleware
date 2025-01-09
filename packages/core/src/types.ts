import type { IncomingMessage, ServerResponse } from "node:http";
import type { EventContext as CloudflarePagesContext } from "@cloudflare/workers-types";
import type { AdapterRequestContext as HattipContext } from "@hattip/core";
import type { RequestCtx as WebrouteContext } from "@webroute/route";
import type { Server as BunServer } from "bun";
import type { Context as ElysiaContext } from "elysia";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { H3Event } from "h3";
import type { Context as HonoContext } from "hono";
import type { methodSymbol, nameSymbol, optionsToSymbols, orderSymbol, pathSymbol, universalSymbol } from "./const";

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
) => Awaitable<Response | OutContext | ((response: Response) => Awaitable<Response>) | void | undefined>;

export type UniversalHandler<InContext extends Universal.Context = Universal.Context, Target = unknown> = (
  request: Request,
  context: InContext,
  runtime: RuntimeAdapterTarget<Target>,
) => Awaitable<Response>;

export type Get<T extends unknown[], U> = (...args: T) => U;

// Router

export enum MiddlewareOrder {
  // Pre-handler Middlewares
  GUARD = -1000, // Guard middleware: Ensures specific conditions or headers are met before proceeding.
  AUTHENTICATION = -900, // Authentication middleware: Verifies user credentials or tokens.
  AUTHORIZATION = -800, // Authorization middleware: Ensures the user has permissions for the route.
  RATE_LIMITING = -700, // Rate limiting middleware: Prevents excessive requests from a client.
  INPUT_VALIDATION = -600, // Input validation middleware: Validates the request payload or query parameters.
  CORS = -500, // CORS middleware: Handles Cross-Origin Resource Sharing settings.
  PARSING = -400, // Parsing middleware: Parses body payloads (e.g., JSON, URL-encoded, multipart).
  CUSTOM_PRE_PROCESSING = -300, // Custom pre-processing middleware: Any custom logic before the main handler.

  // Main Handler
  HANDLER = 0, // Main handler that generates the response.

  // Post-handler Middlewares
  RESPONSE_TRANSFORM = 100, // Response transformation middleware: Modifies the response payload.
  HEADER_MANAGEMENT = 200, // Header management middleware: Adds or modifies HTTP headers (e.g., caching, content type).
  RESPONSE_COMPRESSION = 300, // Response compression middleware: Compresses the response payload (e.g., gzip, brotli).
  RESPONSE_CACHING = 400, // Response caching middleware: Implements caching strategies (e.g., ETag, cache-control).
  LOGGING = 500, // Logging middleware: Logs request and response information.
  ERROR_HANDLING = 600, // Error handling middleware: Processes errors and returns user-friendly responses.
  CUSTOM_POST_PROCESSING = 700, // Custom post-processing middleware: Any custom logic after the response is generated.
}

export interface UniversalSymbols {
  [nameSymbol]: string;
  [methodSymbol]: HttpMethod | HttpMethod[];
  [pathSymbol]: string;
  [orderSymbol]: MiddlewareOrder | number;
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
export type Decorate<T> = T & Partial<UniversalSymbols>;

export type DecoratedMiddleware =
  | Decorate<UniversalMiddleware>
  | { [universalSymbol]: Decorate<UniversalMiddleware> }
  | (Decorate<AnyFn> & { [universalSymbol]: UniversalMiddleware });

export interface UniversalRouterInterface {
  use(middleware: DecoratedMiddleware): this;
  route(handler: DecoratedMiddleware): this;
  applyCatchAll(): void;
}
