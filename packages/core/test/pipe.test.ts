import { describe, expect, test } from "vitest";
import type { RuntimeAdapter, UniversalMiddleware } from "../src/index";
import { pipe } from "../src/pipe";

describe("pipe", () => {
  const request = new Request("http://localhost");
  const context: Universal.Context = {};
  const runtime: RuntimeAdapter = {
    runtime: "other",
    adapter: "other",
    params: undefined,
  };

  test("handler", async () => {
    const handler = pipe(() => new Response("OK"));
    const response = handler(request, context, runtime);
    await expect(response).resolves.toBeInstanceOf(Response);
  });

  test("context middleware |> handler", async () => {
    const handler = pipe(
      () => ({ a: 1 }),
      (_, ctx: { a: number }) => new Response(String(ctx.a)),
    );
    const response = handler(request, context, runtime);
    await expect(response).resolves.toBeInstanceOf(Response);

    const body = await (await response).text();
    expect(body).toBe("1");
  });

  test("context middleware |> empty middlware |> handler", async () => {
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
