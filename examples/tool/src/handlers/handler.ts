import type { Get, UniversalHandler } from "@universal-middleware/core";

const handler: Get<[], UniversalHandler> = () => (_request, ctx) => {
  ctx.long = "a".repeat(1024);
  return new Response(JSON.stringify(ctx), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
  });
};

export default handler;
