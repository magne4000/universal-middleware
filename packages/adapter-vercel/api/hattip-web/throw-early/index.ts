import { middlewares, throwEarlyHandler } from "@universal-middleware/tests/utils";
import { createRouter } from "@hattip/router";
import { createHandler, createMiddleware } from "@universal-middleware/hattip";
import { createEdgeHandler } from "../../../src/hattip.js";

const app = createRouter();

app.use(createMiddleware(() => middlewares.throwEarly)());
app.use(createMiddleware(() => middlewares.contextSync)());
app.use(createMiddleware(() => middlewares.updateHeaders)());
app.use(createMiddleware(() => middlewares.contextAsync)());
app.use(createHandler(throwEarlyHandler)());

export const GET = createEdgeHandler(app);
