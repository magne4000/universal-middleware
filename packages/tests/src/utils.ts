import {
  type CloudflareWorkerdRuntime,
  type Get,
  type UniversalHandler,
  type UniversalMiddleware,
  params,
} from "@universal-middleware/core";

export const middlewares = [
  // universal middleware that updates the context synchronously
  () => () => {
    return {
      something: {
        a: 1,
        c: 3,
      },
    };
  },
  // universal middleware that update the response headers asynchronously
  () => () => {
    return async (response: Response) => {
      response.headers.set("x-test-value", "universal-middleware");
      response.headers.delete("x-should-be-removed");

      await new Promise((resolve) => setTimeout(resolve, 1000));

      return response;
    };
  },
  // universal middleware that updates the context asynchronously
  () => async (_request: Request, context: Universal.Context, runtime) => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    return {
      something: {
        a: (context.something as Record<string, unknown>)?.a,
      },
      somethingElse: {
        b: 2,
      },
      waitUntil: typeof (runtime as CloudflareWorkerdRuntime)?.ctx?.waitUntil,
    };
  },
] as const satisfies Get<[], UniversalMiddleware>[];

export const handler: Get<[], UniversalHandler> = () => (_request, context) => {
  return new Response(JSON.stringify(context, null, 2), {
    headers: {
      "x-should-be-removed": "universal-middleware",
      "content-type": "application/json; charset=utf-8",
    },
  });
};

interface RouteParamOption {
  route?: string;
}

export const routeParamHandler = ((options?) => (request, context, runtime) => {
  const myParams = params(request, runtime, options?.route);

  if (myParams === null || !myParams.name) {
    // Provide a useful error message to the user
    throw new Error(
      "A route parameter named `:name` is required. " +
        "You can set your server route as `/user/:name`, or use the `route` option of this middleware " +
        "to achieve the same purpose.",
    );
  }

  // ...
  return new Response(`User name is: ${myParams.name}`);
}) satisfies (options?: RouteParamOption) => UniversalHandler;
