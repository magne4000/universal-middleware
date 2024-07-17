import type { UniversalHandler } from "universal-middleware";

const handler: UniversalHandler = (_request, _ctx) => {
  return new Response("OK", {
    status: 200,
  });
};

export default handler;
