import { createHandler, createMiddleware } from "@universal-middleware/h3";
import { middlewares, throwEarlyAndLateHandler } from "@universal-middleware/tests/utils";
import { H3 } from "h3";
import { createEdgeHandler } from "../../../src/h3.js";

const app = new H3();

app.use(createMiddleware(() => middlewares.throwEarly)());
app.use(createMiddleware(() => middlewares.throwLate)());
app.use(createMiddleware(() => middlewares.contextSync)());
app.use(createMiddleware(() => middlewares.updateHeaders)());
app.use(createMiddleware(() => middlewares.contextAsync)());
app.use(createHandler(throwEarlyAndLateHandler)());

export const GET = createEdgeHandler(app);
