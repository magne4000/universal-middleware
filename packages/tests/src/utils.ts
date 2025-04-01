import {
  type CloudflareWorkerdRuntime,
  enhance,
  type Get,
  MiddlewareOrder,
  params,
  type UniversalHandler,
  type UniversalMiddleware,
  url,
} from "@universal-middleware/core";

export const middlewares = {
  contextSync() {
    return {
      something: {
        a: 1,
        c: 3,
      },
    };
  },
  updateHeaders() {
    return async (response: Response) => {
      response.headers.set("x-test-value", "universal-middleware");
      response.headers.delete("x-should-be-removed");

      await new Promise((resolve) => setTimeout(resolve, 1000));

      return response;
    };
  },
  async contextAsync(_request, context, runtime) {
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
  guard(request) {
    if (url(request).pathname.endsWith("/guarded")) {
      return new Response("Unauthorized", {
        status: 401,
        statusText: "Unauthorized",
      });
    }
  },
  throw(request) {
    // @ts-expect-error
    return (): Response => {
      if (url(request).pathname.endsWith("/throw")) {
        throw new Error("universal-middleware throw test");
      }
    };
  },
} satisfies Record<string, UniversalMiddleware>;

export const enhancedMiddlewares = {
  contextSync: enhance(middlewares.contextSync, {
    order: MiddlewareOrder.CUSTOM_PRE_PROCESSING,
  }),
  updateHeaders: enhance(middlewares.updateHeaders, {
    order: MiddlewareOrder.CUSTOM_PRE_PROCESSING,
  }),
  contextAsync: enhance(middlewares.contextAsync, {
    order: MiddlewareOrder.CUSTOM_PRE_PROCESSING,
  }),
  guard: enhance(middlewares.guard, {
    order: MiddlewareOrder.AUTHORIZATION,
  }),
  throw: enhance(middlewares.throw, {
    order: MiddlewareOrder.ERROR_HANDLING,
  }),
};

export const handler: Get<[], UniversalHandler> = () =>
  enhance(
    (_request, context) => {
      context.long = "a".repeat(1024);
      return new Response(JSON.stringify(context, null, 2), {
        headers: {
          "x-should-be-removed": "universal-middleware",
          "content-type": "application/json; charset=utf-8",
        },
      });
    },
    {
      path: "/",
      method: "GET",
    },
  );

interface RouteParamOption {
  route?: string;
}

export const routeParamHandler = ((options?) =>
  enhance(
    (request, context, runtime) => {
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
    },
    {
      path: "/user/:name",
      method: "GET",
    },
  )) satisfies (options?: RouteParamOption) => UniversalHandler;

export const guarded: Get<[], UniversalHandler> = () =>
  enhance(
    () => {
      return new Response("Oups, you should not be able to see this");
    },
    {
      path: "/guarded",
      method: ["GET", "POST"],
    },
  );

export const throwHandler: Get<[], UniversalHandler> = () =>
  enhance(
    () => {
      return new Response("Oups, you should not be able to see this");
    },
    {
      path: "/throw",
      method: ["GET", "POST"],
    },
  );
