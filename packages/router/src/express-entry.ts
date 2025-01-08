import { type UniversalHandler, params } from "@universal-middleware/core";
import { createHandler } from "@universal-middleware/express";
import express from "express";
import { applyExpress, decorate } from "./index";

const app = express();

const paramsHandler = (() =>
  decorate(
    (request, _context, runtime) => {
      const myParams = params(request, runtime, undefined);

      if (myParams === null || !myParams.name) {
        // Provide a useful error message to the user
        throw new Error(
          "A route parameter named `:name` is required. " +
            "You can set your server route as `/user/:name`, or use the `route` option of this middleware " +
            "to achieve the same purpose.",
        );
      }

      return new Response(`User name is: ${myParams.name}`);
    },
    {
      method: "GET",
      path: "/user/:name",
    },
  )) satisfies () => UniversalHandler;

applyExpress(app, [
  paramsHandler(),
  decorate(createHandler(() => () => new Response("OK"))(), {
    method: "GET",
    path: "/",
  }),
]);

app.listen(3000, () => {
  console.log("Listening on http://localhost:3000");
});
