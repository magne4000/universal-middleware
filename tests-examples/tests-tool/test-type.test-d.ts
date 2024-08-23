import { expectTypeOf, test } from "vitest";
import honoContextMiddleware from "@universal-middleware-examples/tool/middlewares/context-middleware-hono";
import honoHeadersMiddleware from "@universal-middleware-examples/tool/middlewares/headers-middleware-hono";
import honoHandler from "@universal-middleware-examples/tool/dummy-handler-hono";
import expressContextMiddleware from "@universal-middleware-examples/tool/middlewares/context-middleware-express";
import expressHeadersMiddleware from "@universal-middleware-examples/tool/middlewares/headers-middleware-express";
import expressHandler from "@universal-middleware-examples/tool/dummy-handler-express";
import hattipContextMiddleware from "@universal-middleware-examples/tool/middlewares/context-middleware-hattip";
import hattipHeadersMiddleware from "@universal-middleware-examples/tool/middlewares/headers-middleware-hattip";
import hattipHandler from "@universal-middleware-examples/tool/dummy-handler-hattip";
import webrouteContextMiddleware from "@universal-middleware-examples/tool/middlewares/context-middleware-webroute";
import webrouteHeadersMiddleware from "@universal-middleware-examples/tool/middlewares/headers-middleware-webroute";
import webrouteHandler from "@universal-middleware-examples/tool/dummy-handler-webroute";
import fastifyContextMiddleware from "@universal-middleware-examples/tool/middlewares/context-middleware-fastify";
import fastifyHeadersMiddleware from "@universal-middleware-examples/tool/middlewares/headers-middleware-fastify";
import fastifyHandler from "@universal-middleware-examples/tool/dummy-handler-fastify";
import h3ContextMiddleware from "@universal-middleware-examples/tool/middlewares/context-middleware-h3";
import h3HeadersMiddleware from "@universal-middleware-examples/tool/middlewares/headers-middleware-h3";
import h3Handler from "@universal-middleware-examples/tool/dummy-handler-h3";
import contextMiddleware from "@universal-middleware-examples/tool/middlewares/context-middleware";
import headersMiddleware from "@universal-middleware-examples/tool/middlewares/headers-middleware";
import handler from "@universal-middleware-examples/tool/dummy-handler";
import type { HonoHandler, HonoMiddleware } from "@universal-middleware/hono";
import type {
  HattipHandler,
  HattipMiddleware,
} from "@universal-middleware/hattip";
import type {
  NodeHandler,
  NodeMiddleware,
} from "@universal-middleware/express";
import type {
  WebrouteHandler,
  WebrouteMiddleware,
} from "@universal-middleware/webroute";
import type {
  UniversalHandler,
  UniversalMiddleware,
} from "@universal-middleware/core";
import type {
  FastifyHandler,
  FastifyMiddleware,
} from "@universal-middleware/fastify";
import type { H3Handler, H3Middleware } from "@universal-middleware/h3";

test("hono", () => {
  expectTypeOf(honoContextMiddleware).returns.toEqualTypeOf<HonoMiddleware>();
  expectTypeOf(honoHeadersMiddleware).returns.toEqualTypeOf<HonoMiddleware>();
  expectTypeOf(honoHandler).returns.toEqualTypeOf<HonoHandler>();
});

test("express", () => {
  expectTypeOf(
    expressContextMiddleware,
  ).returns.toEqualTypeOf<NodeMiddleware>();
  expectTypeOf(
    expressHeadersMiddleware,
  ).returns.toEqualTypeOf<NodeMiddleware>();
  expectTypeOf(expressHandler).returns.toEqualTypeOf<NodeHandler>();
});

test("hattip", () => {
  expectTypeOf(
    hattipContextMiddleware,
  ).returns.toEqualTypeOf<HattipMiddleware>();
  expectTypeOf(
    hattipHeadersMiddleware,
  ).returns.toEqualTypeOf<HattipMiddleware>();
  expectTypeOf(hattipHandler).returns.toEqualTypeOf<HattipHandler>();
});

test("webroute", () => {
  expectTypeOf(webrouteContextMiddleware).returns.toEqualTypeOf<
    WebrouteMiddleware<Universal.Context, { hello: string }>
  >();
  expectTypeOf(webrouteHeadersMiddleware).returns.toEqualTypeOf<
    WebrouteMiddleware<{ hello?: string }, { hello?: string }>
  >();
  expectTypeOf(webrouteHandler).returns.toEqualTypeOf<
    WebrouteHandler<Universal.Context, Universal.Context>
  >();
});

test("fastify", () => {
  expectTypeOf(
    fastifyContextMiddleware,
  ).returns.toEqualTypeOf<FastifyMiddleware>();
  expectTypeOf(
    fastifyHeadersMiddleware,
  ).returns.toEqualTypeOf<FastifyMiddleware>();
  expectTypeOf(fastifyHandler).returns.toEqualTypeOf<FastifyHandler>();
});

test("h3", () => {
  expectTypeOf(h3ContextMiddleware).returns.toEqualTypeOf<H3Middleware>();
  expectTypeOf(h3HeadersMiddleware).returns.toEqualTypeOf<H3Middleware>();
  expectTypeOf(h3Handler).returns.toEqualTypeOf<H3Handler>();
});

test("generic", () => {
  expectTypeOf(contextMiddleware).returns.toEqualTypeOf<
    (req: Request, ctx: Universal.Context) => { hello: string }
  >();
  expectTypeOf(headersMiddleware).returns.toMatchTypeOf<
    UniversalMiddleware<{ hello?: string }>
  >();
  expectTypeOf(handler).returns.toEqualTypeOf<UniversalHandler>();
});
