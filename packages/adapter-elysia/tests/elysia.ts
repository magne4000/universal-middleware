import { handler, middlewares, routeParamHandler } from "@universal-middleware/tests/utils";
import { Elysia } from "elysia";
import { createHandler, createMiddleware } from "../src/index.js";

export const app = new Elysia()
  .use(createMiddleware(middlewares[0])())
  .use(createMiddleware(middlewares[1])())
  .use(createMiddleware(middlewares[2])())
  .get("/user/:name", createHandler(routeParamHandler)())
  .get("/", createHandler(handler)());
