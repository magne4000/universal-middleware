import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cancelReplacedBody, enhance, pipe, type RuntimeAdapter } from "../src/index";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

// A body that never ends, like SSE: only cancel() releases it
function endless() {
  const state = { cancelled: false };
  const response = new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("original"));
      },
      cancel() {
        state.cancelled = true;
      },
    }),
  );
  return { state, response };
}

// Lets the replacement start reading, then runs the deferred cancellation
const settle = () => vi.runAllTimersAsync();

async function firstChunk(response: Response) {
  const { value } = await (response.body as ReadableStream<Uint8Array>).getReader().read();
  return new TextDecoder().decode(value);
}

describe("cancelReplacedBody", () => {
  test("cancels a body the replacement does not use", async () => {
    const { state, response } = endless();
    cancelReplacedBody(response, new Response("replacement"));
    await settle();

    expect(state.cancelled).toBe(true);
  });

  test.each([
    ["its stream", (original: Response) => new Response(original.body, original)],
    ["a pipeThrough", (original: Response) => new Response(original.body?.pipeThrough(new TransformStream()))],
    ["a clone", (original: Response) => original.clone()],
    [
      "a wrapper that pulls from it",
      (original: Response) => {
        let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
        return new Response(
          new ReadableStream<Uint8Array>({
            async pull(controller) {
              reader ??= (original.body as ReadableStream<Uint8Array>).getReader();
              const { value, done } = await reader.read();
              if (done) controller.close();
              else controller.enqueue(value);
            },
          }),
        );
      },
    ],
  ])("keeps a body the replacement reads through %s", async (_, replace) => {
    const { state, response } = endless();
    const replacement = replace(response);
    cancelReplacedBody(response, replacement);
    await settle();

    expect(await firstChunk(replacement)).toBe("original");
    expect(state.cancelled).toBe(false);
  });

  test("does nothing without a replacement", async () => {
    const { state, response } = endless();
    cancelReplacedBody(response, undefined);
    cancelReplacedBody(response, response);
    await settle();

    expect(state.cancelled).toBe(false);
  });
});

describe("pipe", () => {
  test("cancels the body a response function replaces", async () => {
    const { state, response } = endless();
    const replace = enhance(() => () => new Response("replacement"), { name: "replace" });
    const runtime: RuntimeAdapter = { runtime: "other", adapter: "other", params: undefined };

    const result = await pipe(replace, () => response)(new Request("http://localhost/"), {}, runtime);
    await settle();

    expect(await result.text()).toBe("replacement");
    expect(state.cancelled).toBe(true);
  });
});
