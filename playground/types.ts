import type { UniversalRequest } from "@universal-middleware/core";

export type UniversalHandler<T extends object> = (
  req: UniversalRequest<T>,
  context: Record<string, unknown>,
) => Response | Promise<Response>;
