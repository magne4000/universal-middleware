import { middlewares, throwEarlyAndLateHandler } from "@universal-middleware/tests/utils";
import express from "express";
import { createHandler, createMiddleware } from "@universal-middleware/express";
import { createNodeHandler } from "../../../src/express.js";

const app = express();

app.use(createMiddleware(() => middlewares.throwEarly)());
app.use(createMiddleware(() => middlewares.throwLate)());
app.use(createMiddleware(() => middlewares.contextSync)());
app.use(createMiddleware(() => middlewares.updateHeaders)());
app.use(createMiddleware(() => middlewares.contextAsync)());
app.use(createHandler(throwEarlyAndLateHandler)());

export default createNodeHandler(app);
