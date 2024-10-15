import type { Get, UniversalHandler } from "@universal-middleware/core";

const handler: Get<[], UniversalHandler> = () => (_request, ctx) => {
  ctx.long = "a".repeat(1024);
  return new Response(JSON.stringify(ctx), {
    status: 200,
  });
};

export default handler;
