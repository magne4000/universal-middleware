import { createHandler, createMiddleware } from "../src/index.js";
import express from "express";
import helmet from "helmet";
import { args, handler, middlewares } from "@universal-middleware/tests";
import type { Get, UniversalMiddleware } from "@universal-middleware/core";

const app = express();

app.use(helmet());

middlewares.forEach((middleware) =>
  app.use(createMiddleware(middleware as Get<[], UniversalMiddleware>)()),
);

// universal handler
app.get("/", createHandler(handler)());

const port = args.port ? parseInt(args.port) : 3000;

app.listen(port, "localhost", () => {
  console.log(`Server listening on http://localhost:${port}`);
});
