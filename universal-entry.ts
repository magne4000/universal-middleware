// Express
import { renderPage } from "vike/server";

export async function vikeHandler(
  req: Request,
  context: Record<string, unknown>,
): Promise<Response> {
  const pageContextInit = { urlOriginal: req.url };

  const pageContext = await renderPage(pageContextInit);
  const { httpResponse } = pageContext;

  context.vike = true;

  return new Response(
    httpResponse ? httpResponse?.getReadableWebStream() : null,
    {
      status: httpResponse?.statusCode,
      headers: httpResponse?.headers,
    },
  );
}
