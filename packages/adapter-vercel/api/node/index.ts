import { pipe } from "@universal-middleware/core";
import { handler, middlewares } from "@universal-middleware/tests/utils";
import { createNodeHandler } from "../../src/index.js";

const pipedHandler = createNodeHandler(() => pipe(middlewares[0](), middlewares[1](), middlewares[2](), handler()))();

export default pipedHandler;
