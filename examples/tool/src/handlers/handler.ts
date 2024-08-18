import type { Get, UniversalHandler } from "universal-middleware";

const handler: Get<[], UniversalHandler> = () => (_request, ctx) => {
  return new Response("context: " + JSON.stringify(ctx), {
    status: 200,
  });
};

export default handler;
