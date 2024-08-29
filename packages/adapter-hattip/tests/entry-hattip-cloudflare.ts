import cloudflareWorkersAdapter from "@hattip/adapter-cloudflare-workers/no-static";
import hattipHandler from "./hattip";

export default {
  fetch: cloudflareWorkersAdapter(hattipHandler),
};
