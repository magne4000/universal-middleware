import { type Get, type UniversalHandler, type UniversalMiddleware, pipe } from "@universal-middleware/core";
import { createHandler, createMiddleware } from "@universal-middleware/hono";
// ---cut---
const middlewareStatus = (() => (request, context, runtime) => {
  return { status: "OK" };
}) satisfies Get<[], UniversalMiddleware>;

const middlewareEarlyResponseError = (() => (request, context, runtime) => {
  if (context.status && context.status !== "OK") {
    return new Response("Error", { status: 500 });
  }
}) satisfies Get<[], UniversalMiddleware>;

const handler = (() => (request, context, runtime) => {
  return new Response(context.status ?? "OK");
}) satisfies Get<[], UniversalHandler<{ status?: string }>>;

const honoMiddlewareStatus = createMiddleware(middlewareStatus);
const honoHandler = createHandler(handler);

const newHandler = pipe(honoMiddlewareStatus(), middlewareEarlyResponseError(), handler());
const newHandler2 = pipe(middlewareStatus(), middlewareEarlyResponseError(), honoHandler());
