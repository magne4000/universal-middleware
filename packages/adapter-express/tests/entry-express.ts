import { args } from "@universal-middleware/tests";
import {
  enhancedMiddlewares,
  guarded,
  handler,
  middlewares,
  routeParamHandler
} from "@universal-middleware/tests/utils";
import express from "express";
import helmet from "helmet";
import { apply, createHandler, createMiddleware } from "../src/index.js";

const app = express();

app.use(helmet());

const TEST_CASE = process.env.TEST_CASE;

switch (TEST_CASE) {
  case "router": {
    apply(app, [
      middlewares.guard,
      middlewares.contextSync,
      middlewares.updateHeaders,
      middlewares.contextAsync,
      routeParamHandler(),
      guarded(),
      handler(),
    ]);

    break;
  }
  case "router_enhanced": {
    apply(app, [
      routeParamHandler(),
      guarded(),
      handler(),
      enhancedMiddlewares.contextSync,
      enhancedMiddlewares.updateHeaders,
      enhancedMiddlewares.contextAsync,
      enhancedMiddlewares.guard,
    ]);

    break;
  }
  default: {
    app.use(createMiddleware(() => middlewares.guard)());
    app.use(createMiddleware(() => middlewares.contextSync)());
    app.use(createMiddleware(() => middlewares.updateHeaders)());
    app.use(createMiddleware(() => middlewares.contextAsync)());
    app.get("/user/:name", createHandler(routeParamHandler)());
    app.get("/guarded", createHandler(guarded)());
    app.get("/", createHandler(handler)());
  }
}

const port = args.port ? Number.parseInt(args.port) : 3000;

app.listen(port, "localhost", () => {
  console.log(`Server listening on http://localhost:${port}`);
});
