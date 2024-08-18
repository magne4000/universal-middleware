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
    WebrouteMiddleware<Universal.Context, { something: string }>
  >();
  expectTypeOf(webrouteHeadersMiddleware).returns.toEqualTypeOf<
    WebrouteMiddleware<{ something?: string }, { something?: string }>
  >();
  expectTypeOf(webrouteHandler).returns.toEqualTypeOf<
    WebrouteHandler<Universal.Context, Universal.Context>
  >();
});

test("generic", () => {
  expectTypeOf(contextMiddleware).returns.toEqualTypeOf<
    (req: Request, ctx: Universal.Context) => { something: string }
  >();
  expectTypeOf(headersMiddleware).returns.toEqualTypeOf<
    UniversalMiddleware<{ something?: string }>
  >();
  expectTypeOf(handler).returns.toEqualTypeOf<UniversalHandler>();
});
