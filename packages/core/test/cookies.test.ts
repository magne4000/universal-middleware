import { describe } from "node:test";
import { expect, test } from "vitest";
import { deleteCookie, getCookie, getCookies, setCookie } from "../src/cookies/index";

describe("getCookie", () => {
  test("simple cookie", () => {
    const request = new Request("http://localhost", {
      headers: {
        cookie: "foo=bar",
      },
    });

    expect(getCookie(request, "foo")).toEqual(
      expect.objectContaining({
        key: "foo",
        value: "bar",
      }),
    );
  });

  test("several cookies", () => {
    const request = new Request("http://localhost", {
      headers: {
        cookie: "foo=bar;foo2=bar2",
      },
    });

    expect(getCookie(request, "foo")).toEqual(
      expect.objectContaining({
        key: "foo",
        value: "bar",
      }),
    );
    expect(getCookie(request, "foo2")).toEqual(
      expect.objectContaining({
        key: "foo2",
        value: "bar2",
      }),
    );
  });
});

describe("getCookies", () => {
  test("simple cookie", () => {
    const request = new Request("http://localhost", {
      headers: {
        cookie: "foo=bar",
      },
    });

    expect(getCookies(request)).toEqual([
      expect.objectContaining({
        key: "foo",
        value: "bar",
      }),
    ]);
  });

  test("several cookies", () => {
    const request = new Request("http://localhost", {
      headers: {
        cookie: "foo=bar;foo2=bar2",
      },
    });

    expect(getCookies(request)).toEqual([
      expect.objectContaining({
        key: "foo",
        value: "bar",
      }),
      expect.objectContaining({
        key: "foo2",
        value: "bar2",
      }),
    ]);
  });
});

describe("setCookie", () => {
  test("simple cookie", () => {
    const response = new Response(null);

    setCookie(response, "foo", "bar");

    expect(response.headers.getSetCookie()).toEqual(["foo=bar"]);
  });

  test("multiple cookies", () => {
    const response = new Response(null);

    setCookie(response, "foo", "bar");
    setCookie(response, "foo2", "bar2");

    expect(response.headers.getSetCookie()).toEqual(["foo=bar", "foo2=bar2"]);
  });

  test("cookie with options", () => {
    const response = new Response(null);

    setCookie(response, "foo", "bar", {
      maxAge: 3600,
    });

    expect(response.headers.getSetCookie()).toEqual(["foo=bar; Max-Age=3600"]);
  });

  test("override cookie", () => {
    const response = new Response(null);

    setCookie(response, "foo", "bar");
    setCookie(response, "foo", "bar2");

    expect(response.headers.getSetCookie()).toEqual(["foo=bar2"]);
  });
});

describe("deleteCookie", () => {
  test("only one cookie", () => {
    const response = new Response(null, {
      headers: {
        "set-cookie": "foo=bar",
      },
    });

    expect(response.headers.getSetCookie()).toEqual(["foo=bar"]);
    deleteCookie(response, "foo");
    expect(response.headers.getSetCookie()).toEqual([]);
  });

  test("delete one of many", () => {
    const response = new Response(null, {
      headers: [
        ["set-cookie", "foo=bar"],
        ["set-cookie", "foo2=bar2"],
      ],
    });

    expect(response.headers.getSetCookie()).toEqual(["foo=bar", "foo2=bar2"]);
    deleteCookie(response, "foo");
    expect(response.headers.getSetCookie()).toEqual(["foo2=bar2"]);
  });
});
