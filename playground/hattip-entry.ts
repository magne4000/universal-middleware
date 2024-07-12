import type { HattipHandler } from "@hattip/core";
import { createRouter } from "@hattip/router";

const router = createRouter();

router.use(async () => {
  return new Response("OK");
});

export default router.buildHandler() as HattipHandler;
