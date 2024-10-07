import type { ExecutionContext } from "@cloudflare/workers-types";
import { Elysia } from "elysia";
import { app } from "./elysia";

export default {
  fetch: async (request: Request, env: unknown, ctx: ExecutionContext) => {
    return new Elysia({ aot: false }).use(app).decorate({ env, ctx }).handle(request);
  },
};
