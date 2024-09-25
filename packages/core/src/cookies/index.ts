import { Cookie, type CreateCookieOptions } from "tough-cookie";

export function getCookie(request: Request, name: string): Cookie | undefined {
  const cookies = getCookies(request);
  return cookies.find((c) => c.key === name);
}

export function getCookies(request: Request): Cookie[] {
  const cookies = request.headers.get("Cookie");
  return (
    cookies
      ?.split(";")
      .map((x) => Cookie.parse(x))
      .filter((x) => x !== undefined) ?? []
  );
}

export function setCookie(
  response: Response,
  name: string,
  value: string,
  options?: Omit<CreateCookieOptions, "key" | "value">,
): void {
  deleteCookie(response, name);
  response.headers.append(
    "Set-Cookie",
    new Cookie({
      ...options,
      key: name,
      value,
    }).toString(),
  );
}

export function deleteCookie(response: Response, name: string): void {
  const cookies = response.headers.getSetCookie();
  response.headers.delete("Set-Cookie");

  for (const cookie of cookies) {
    const c = Cookie.parse(cookie);

    if (c && c.key !== name) {
      response.headers.append("Set-Cookie", cookie);
    }
  }
}
