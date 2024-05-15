import type { RequestContext } from "@hattip/compose";

export type UniversalHandler = (
  req: Request,
  context: Record<string, unknown>,
) => Response | Promise<Response>;
