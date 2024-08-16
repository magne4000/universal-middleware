import type { Get, UniversalHandler } from "universal-middleware";
import { getContext } from "@universal-middleware/core";

const handler: Get<[], UniversalHandler> = () => (request) => {
  return new Response("context: " + JSON.stringify(getContext(request)), {
    status: 200,
  });
};

export default handler;
