import { cors } from "@hattip/cors";
import { createRouter } from "@hattip/router";
import type { Get, UniversalMiddleware } from "@universal-middleware/core";
import { handler, middlewares, routeParamHandler } from "@universal-middleware/tests/utils";
import { createHandler, createMiddleware } from "../src/index.js";

const app = createRouter();

// standard hattip middleware
app.use(cors());

for (const middleware of middlewares) {
  app.use(createMiddleware(middleware as Get<[], UniversalMiddleware>)());
}

// route params handler
app.get("/user/:name", createHandler(routeParamHandler)());

// universal handler
app.get("/", createHandler(handler)());

export default app.buildHandler();
