import type { CloudflareWorkerdRuntime, UniversalMiddleware } from "@universal-middleware/core";

// Calls the real workerd ExecutionContext / EventContext method through `runtime.ctx`
export const waitUntilMiddleware: UniversalMiddleware = (_request, _context, runtime) => {
  const { ctx } = runtime as CloudflareWorkerdRuntime;
  if (!ctx?.waitUntil) throw new Error("runtime.ctx.waitUntil is missing");
  ctx.waitUntil(Promise.resolve());

  return (response: Response) => {
    response.headers.set("x-wait-until", "called");
    return response;
  };
};
