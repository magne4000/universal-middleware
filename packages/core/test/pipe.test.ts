import { describe, expect, test } from "vitest";
import {
  bindUniversal,
  enhance,
  MiddlewareOrder,
  type RuntimeAdapter,
  type UniversalFn,
  type UniversalHandler,
  type UniversalMiddleware,
  universalSymbol,
} from "../src/index";
import { pipe } from "../src/pipe";

describe("pipe", () => {
  const request = new Request("http://localhost");
  const context: Universal.Context = {};
  const runtime: RuntimeAdapter = {
    runtime: "other",
    adapter: "other",
    params: undefined,
  };

  function wrapHandler<U extends UniversalHandler<any>>(
    universal: U,
  ): UniversalFn<U, (a: number) => Promise<Response>> {
    return bindUniversal(universal, async function wrappedHandler(a) {
      const response = await this[universalSymbol](request, context, runtime);
      response.headers.set("a", String(a));
      return response;
    });
  }

  function wrapMiddleware<
    In extends Universal.Context = Universal.Context,
    Out extends Universal.Context = Universal.Context,
    U extends UniversalMiddleware<In, Out> = UniversalMiddleware<In, Out>,
  >(universal: U) {
    return bindUniversal(universal, function wrappedMiddleware(_: number) {
      return this[universalSymbol](request, context as In, runtime);
    });
  }

  test("handler", async () => {
    const handler = pipe(() => new Response("OK"));
    const response = handler(request, context, runtime);
    await expect(response).resolves.toBeInstanceOf(Response);
  });

  test("wrapped handler", async () => {
    const handler = pipe(wrapHandler(() => new Response("OK")));
    const response = handler(1);
    await expect(response).resolves.toBeInstanceOf(Response);
    expect((await response).headers.get("a")).toEqual("1");
  });

  test("context middleware |> handler", async () => {
    const handler = pipe(
      () => ({ a: 1 }),
      (_: Request, ctx: { a: number }) => new Response(String(ctx.a)),
    );
    const response = handler(request, context, runtime);
    await expect(response).resolves.toBeInstanceOf(Response);

    const body = await (await response).text();
    expect(body).toBe("1");
  });

  test("context middleware |> wrapped handler", async () => {
    const handler = pipe(
      () => ({ a: 1 }),
      wrapHandler((_: Request, ctx: { a: number }) => new Response(String(ctx.a))),
    );
    const response = handler(2);
    await expect(response).resolves.toBeInstanceOf(Response);

    const responseAwaited = await response;
    const body = await responseAwaited.text();
    expect(body).toBe("1");
    expect(responseAwaited.headers.get("a")).toEqual("2");
  });

  test("context middleware |> empty middleware |> handler", async () => {
    const handler = pipe(
      () => ({ a: 1 }),
      (async () => {}) as UniversalMiddleware<{ a: number }, { a: number }>,
      (_: Request, ctx: { a: number }) => new Response(String(ctx.a)),
    );
    const response = handler(request, context, runtime);
    await expect(response).resolves.toBeInstanceOf(Response);

    const body = await (await response).text();
    expect(body).toBe("1");
  });

  test("context middleware |> wrapped empty middleware |> handler", async () => {
    const handler = pipe(
      () => ({ a: 1 }),
      wrapMiddleware<{ a: number }, { a: number }>(async () => {}),
      (_: Request, ctx: { a: number }) => new Response(String(ctx.a)),
    );
    const response = handler(request, context, runtime);
    await expect(response).resolves.toBeInstanceOf(Response);

    const body = await (await response).text();
    expect(body).toBe("1");
  });

  test("context middleware |> context middleware |> handler", async () => {
    const handler = pipe(
      () => ({ a: 1 }),
      async (_: Request, ctx: { a: number }) => {
        return {
          ...ctx,
          b: 2,
        };
      },
      (_: Request, ctx: { a: number; b: number }) => new Response(String(ctx.a + ctx.b)),
    );
    const response = handler(request, context, runtime);
    await expect(response).resolves.toBeInstanceOf(Response);

    const body = await (await response).text();
    expect(body).toBe("3");
  });

  test("context middleware |> wrapped context middleware |> handler", async () => {
    const handler = pipe(
      () => ({ a: 1 }),
      wrapMiddleware<{ a: number }, { a: number; b: number }>(async (_, ctx) => {
        return {
          ...ctx,
          b: 2,
        };
      }),
      (_: Request, ctx: { a: number; b: number }) => new Response(String(ctx.a + ctx.b)),
    );
    const response = handler(request, context, runtime);
    await expect(response).resolves.toBeInstanceOf(Response);

    const body = await (await response).text();
    expect(body).toBe("3");
  });

  test("context middleware |> response |> handler", async () => {
    const handler = pipe(
      () => ({ a: 1 }),
      async (_: Request) => {
        return new Response("STOPPED");
      },
      (_: Request) => new Response(null),
    );
    const response = handler(request, context, runtime);
    await expect(response).resolves.toBeInstanceOf(Response);

    const body = await (await response).text();
    expect(body).toBe("STOPPED");
  });

  test("context middleware |> response handler |> handler", async () => {
    const handler = pipe(
      () => ({ a: 1 }),
      (_: Request) => {
        return async (response: Response) => {
          const body = await response.text();
          return new Response(`${body} World!`);
        };
      },
      (_: Request) => new Response("Hello"),
    );
    const response = handler(request, context, runtime);
    await expect(response).resolves.toBeInstanceOf(Response);

    const body = await (await response).text();
    expect(body).toBe("Hello World!");
  });

  test("context middleware |> handler |> positive-order response handler", async () => {
    const handler = pipe(
      () => ({ a: 1 }),
      (_: Request) => new Response("Hello"),
      enhance(
        (_: Request) => {
          return async (response: Response) => {
            const body = await response.text();
            return new Response(`${body} World!`);
          };
        },
        { order: MiddlewareOrder.RESPONSE_TRANSFORM },
      ),
    ) as UniversalHandler;
    const response = handler(request, context, runtime);
    await expect(response).resolves.toBeInstanceOf(Response);

    const body = await (await response).text();
    expect(body).toBe("Hello World!");
  });

  test("handler |> logger: a middleware without order doesn't run once the handler answered", async () => {
    const ran: string[] = [];
    const handler = pipe(
      (_: Request) => new Response("Hello"),
      (_: Request) => void ran.push("logger"),
      enhance((_: Request) => void ran.push("always"), { runs: "always" }),
    ) as UniversalHandler;
    const body = await (await handler(request, context, runtime)).text();
    expect(body).toBe("Hello");
    expect(ran).toEqual(["always"]);
  });

  test("enhanced logger |> handler", async () => {
    let logged = false;
    const handler = pipe(
      enhance(
        (_: Request) => {
          logged = true;
        },
        {
          order: MiddlewareOrder.LOGGING,
        },
      ),
      (_: Request) => new Response(logged ? "Logged" : "Hello"),
    ) as UniversalHandler;
    const response = handler(request, context, runtime);
    await expect(response).resolves.toBeInstanceOf(Response);

    const body = await (await response).text();
    expect(body).toBe("Hello");
    expect(logged).toBe(true);
  });

  test("passes the request on when nothing answers, with the context it returned", async () => {
    const middleware = pipe(
      () => ({ a: 1 }),
      (_: Request, ctx: { a: number }) => ({ ...ctx, b: 2 }),
    );
    expect(await middleware(request, {}, runtime)).toEqual({ a: 1, b: 2 });
    expect(await pipe(() => {})(request, {}, runtime)).toBeUndefined();
  });

  test("passes the request on with the response functions, and the context in the caller's object", async () => {
    const callerContext: Universal.Context = {};
    const middleware = pipe(
      () => ({ user: "ann" }),
      (_: Request, ctx: { user: string }) => (response: Response) => {
        response.headers.set("x-user", ctx.user);
        return response;
      },
      enhance(
        () => (response: Response) => {
          response.headers.append("x-order", "late");
          return response;
        },
        { order: MiddlewareOrder.HEADER_MANAGEMENT },
      ),
    ) as UniversalMiddleware;
    const responseFunction = await middleware(request, callerContext, runtime);
    expect(typeof responseFunction).toBe("function");
    expect(callerContext).toEqual({ user: "ann" });

    const response = await (responseFunction as (r: Response) => Promise<Response>)(new Response("downstream"));
    expect(response.headers.get("x-user")).toBe("ann");
    expect(response.headers.get("x-order")).toBe("late");
  });

  test("a positive-order middleware returning a Response fails, an `always` one's is ignored", async () => {
    const throws = pipe(
      (_: Request) => new Response("Hello"),
      enhance(() => new Response("cached"), { name: "cache", order: MiddlewareOrder.CONDITIONAL_REQUESTS }),
    ) as UniversalHandler;
    await expect(throws(request, context, runtime)).rejects.toThrow(/cache runs once a Response exists/);

    const ignores = pipe(
      (_: Request) => new Response("Hello"),
      enhance(() => new Response("late"), { runs: "always", order: 100 }),
    ) as UniversalHandler;
    expect(await (await ignores(request, context, runtime)).text()).toBe("Hello");
  });

  test("calls sharing a context object stay apart", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const handler = pipe(
      async (req: Request) => {
        if (req.headers.has("x-wait")) await gate;
      },
      (req: Request) => new Response(req.headers.get("x-name")),
    ) as UniversalHandler;
    const shared: Universal.Context = {};
    const first = handler(
      new Request("http://localhost", { headers: { "x-wait": "1", "x-name": "first" } }),
      shared,
      runtime,
    );
    const second = await handler(new Request("http://localhost", { headers: { "x-name": "second" } }), shared, runtime);
    release();
    expect(await second.text()).toBe("second");
    expect(await (await first).text()).toBe("first");
  });
});
