import { args } from "@universal-middleware/tests";
import { handler, middlewares, routeParamHandler } from "@universal-middleware/tests/utils";
import express from "express";
import helmet from "helmet";
import { apply } from "../src/index.js";

const app = express();

app.use(helmet());

apply(app, [middlewares[0](), middlewares[1](), middlewares[2](), routeParamHandler(), handler()]);

const port = args.port ? Number.parseInt(args.port) : 3000;

app.listen(port, "localhost", () => {
  console.log(`Server listening on http://localhost:${port}`);
});
