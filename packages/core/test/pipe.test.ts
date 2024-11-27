import { describe, expect, test } from "vitest";
import {
  type RuntimeAdapter,
  type UniversalHandler,
  type UniversalMiddleware,
  bindUniversal,
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

  function wrapHandler<U extends UniversalHandler<any>>(universal: U) {
    return bindUniversal(universal, async function wrappedHandler(a: number) {
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
});
