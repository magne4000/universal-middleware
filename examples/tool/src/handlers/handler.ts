import type { Get, UniversalHandler } from "@universal-middleware/core";

const handler: Get<[], UniversalHandler> = () => (_request, ctx) => {
  return new Response(`${JSON.stringify(ctx)} ${"a".repeat(1024)}`, {
    status: 200,
  });
};

export default handler;
