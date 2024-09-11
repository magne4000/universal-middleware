import type { Get, UniversalMiddleware } from "@universal-middleware/core";
import { args } from "@universal-middleware/tests";
import { handler, middlewares, routeParamHandler } from "@universal-middleware/tests/utils";
import express from "express";
import helmet from "helmet";
import { createHandler, createMiddleware } from "../src/index.js";

const app = express();

app.use(helmet());

for (const middleware of middlewares) {
  app.use(createMiddleware(middleware as Get<[], UniversalMiddleware>)());
}

// route params handler
app.get("/user/:name", createHandler(routeParamHandler)());

// universal handler
app.get("/", createHandler(handler)());

const port = args.port ? Number.parseInt(args.port) : 3000;

app.listen(port, "localhost", () => {
  console.log(`Server listening on http://localhost:${port}`);
});
