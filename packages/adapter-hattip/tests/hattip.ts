import { createHandler, createMiddleware } from "../src/index.js";
import { cors } from "@hattip/cors";
import { handler, middlewares } from "@universal-middleware/tests/utils";
import { createRouter } from "@hattip/router";
import type { Get, UniversalMiddleware } from "@universal-middleware/core";

const app = createRouter();

// standard hattip middleware
app.use(cors());

middlewares.forEach((middleware) =>
  app.use(createMiddleware(middleware as Get<[], UniversalMiddleware>)()),
);

// universal handler
app.get("/", createHandler(handler)());

export default app.buildHandler();
