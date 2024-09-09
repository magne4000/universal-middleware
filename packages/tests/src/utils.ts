import type { CloudflareWorkerdRuntime, Get, UniversalHandler, UniversalMiddleware } from "@universal-middleware/core";

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
