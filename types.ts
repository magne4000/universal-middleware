export type UniversalHandler = (
  req: Request,
  context: Record<string, unknown>,
) => Response | Promise<Response>;
