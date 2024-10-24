import handler from "@universal-middleware-examples/tool/dummy-handler";
import expressHandler from "@universal-middleware-examples/tool/dummy-handler-express";
import fastifyHandler from "@universal-middleware-examples/tool/dummy-handler-fastify";
import genericHandler from "@universal-middleware-examples/tool/dummy-handler-generic";
import h3Handler from "@universal-middleware-examples/tool/dummy-handler-h3";
import hattipHandler from "@universal-middleware-examples/tool/dummy-handler-hattip";
import honoHandler from "@universal-middleware-examples/tool/dummy-handler-hono";
import webrouteHandler from "@universal-middleware-examples/tool/dummy-handler-webroute";
import contextMiddleware from "@universal-middleware-examples/tool/middlewares/context-middleware";
import expressContextMiddleware from "@universal-middleware-examples/tool/middlewares/context-middleware-express";
import fastifyContextMiddleware from "@universal-middleware-examples/tool/middlewares/context-middleware-fastify";
import genericContextMiddleware from "@universal-middleware-examples/tool/middlewares/context-middleware-generic";
import h3ContextMiddleware from "@universal-middleware-examples/tool/middlewares/context-middleware-h3";
import hattipContextMiddleware from "@universal-middleware-examples/tool/middlewares/context-middleware-hattip";
import honoContextMiddleware from "@universal-middleware-examples/tool/middlewares/context-middleware-hono";
import webrouteContextMiddleware from "@universal-middleware-examples/tool/middlewares/context-middleware-webroute";
import headersMiddleware from "@universal-middleware-examples/tool/middlewares/headers-middleware";
import expressHeadersMiddleware from "@universal-middleware-examples/tool/middlewares/headers-middleware-express";
import fastifyHeadersMiddleware from "@universal-middleware-examples/tool/middlewares/headers-middleware-fastify";
import genericHeadersMiddleware from "@universal-middleware-examples/tool/middlewares/headers-middleware-generic";
import h3HeadersMiddleware from "@universal-middleware-examples/tool/middlewares/headers-middleware-h3";
import hattipHeadersMiddleware from "@universal-middleware-examples/tool/middlewares/headers-middleware-hattip";
import honoHeadersMiddleware from "@universal-middleware-examples/tool/middlewares/headers-middleware-hono";
import webrouteHeadersMiddleware from "@universal-middleware-examples/tool/middlewares/headers-middleware-webroute";
import type {
  UniversalHandler,
  UniversalHandlerShort,
  UniversalMiddleware,
  UniversalMiddlewareShort,
} from "@universal-middleware/core";
import type { NodeHandler, NodeMiddleware } from "@universal-middleware/express";
import type { FastifyHandler, FastifyMiddleware } from "@universal-middleware/fastify";
import type { H3Handler, H3Middleware } from "@universal-middleware/h3";
import type { HattipHandler, HattipMiddleware } from "@universal-middleware/hattip";
import type { HonoHandler, HonoMiddleware } from "@universal-middleware/hono";
import type { WebrouteHandler, WebrouteMiddleware } from "@universal-middleware/webroute";
import { expectTypeOf, test } from "vitest";

test("hono", () => {
  expectTypeOf(honoContextMiddleware).returns.toEqualTypeOf<HonoMiddleware>();
  expectTypeOf(honoHeadersMiddleware).returns.toEqualTypeOf<HonoMiddleware>();
  expectTypeOf(honoHandler).returns.toEqualTypeOf<HonoHandler>();
});

test("express", () => {
  expectTypeOf(expressContextMiddleware).returns.toEqualTypeOf<NodeMiddleware<{ hello: string }>>();
  expectTypeOf(expressHeadersMiddleware).returns.toEqualTypeOf<NodeMiddleware>();
  expectTypeOf(expressHandler).returns.toEqualTypeOf<NodeHandler>();
});

test("hattip", () => {
  expectTypeOf(hattipContextMiddleware).returns.toEqualTypeOf<HattipMiddleware>();
  expectTypeOf(hattipHeadersMiddleware).returns.toEqualTypeOf<HattipMiddleware>();
  expectTypeOf(hattipHandler).returns.toEqualTypeOf<HattipHandler>();
});

test("webroute", () => {
  expectTypeOf(webrouteContextMiddleware).returns.toEqualTypeOf<
    // biome-ignore lint/suspicious/noConfusingVoidType: <explanation>
    WebrouteMiddleware<Universal.Context, void | { hello: string }>
  >();
  expectTypeOf(webrouteHeadersMiddleware).returns.toEqualTypeOf<
    // biome-ignore lint/suspicious/noConfusingVoidType: <explanation>
    WebrouteMiddleware<Universal.Context, void | Universal.Context>
  >();
  expectTypeOf(webrouteHandler).returns.toEqualTypeOf<WebrouteHandler<Universal.Context, void>>();
});

test("fastify", () => {
  expectTypeOf(fastifyContextMiddleware).returns.toEqualTypeOf<FastifyMiddleware>();
  expectTypeOf(fastifyHeadersMiddleware).returns.toEqualTypeOf<FastifyMiddleware>();
  expectTypeOf(fastifyHandler).returns.toEqualTypeOf<FastifyHandler>();
});

test("h3", () => {
  expectTypeOf(h3ContextMiddleware).returns.toEqualTypeOf<H3Middleware>();
  expectTypeOf(h3HeadersMiddleware).returns.toEqualTypeOf<H3Middleware>();
  expectTypeOf(h3Handler).returns.toEqualTypeOf<H3Handler>();
});

test("universal", () => {
  expectTypeOf(contextMiddleware).returns.toEqualTypeOf<(req: Request, ctx: Universal.Context) => { hello: string }>();
  expectTypeOf(headersMiddleware).returns.toMatchTypeOf<UniversalMiddleware<{ hello?: string }>>();
  expectTypeOf(handler).returns.toEqualTypeOf<UniversalHandler>();
});

test("generic", () => {
  expectTypeOf(genericContextMiddleware).returns.toEqualTypeOf<UniversalMiddlewareShort<{ hello: string }>>();
  expectTypeOf(genericHeadersMiddleware).returns.toMatchTypeOf<UniversalMiddlewareShort>();
  expectTypeOf(genericHandler).returns.toEqualTypeOf<UniversalHandlerShort>();
});
