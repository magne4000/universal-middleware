# Cookie helpers

The cookie helpers provide an interface to manipulate cookie headers on `Request` and `Response`.

[tough-cookie](https://github.com/salesforce/tough-cookie) is used to represent Cookie objects returned by the helpers.

## Usage

```ts twoslash
import { env, type Get, type UniversalMiddleware } from "@universal-middleware/core";
import {
  getCookie,
  getCookies,
  setCookie,
  deleteCookie
} from "@universal-middleware/core/cookie";

const middleware = (() => (request, context, runtime) => {
  const fooCookie = getCookie(request, "foo");
  const allCookies = getCookies(request);
  // ...
}) satisfies Get<[], UniversalMiddleware>;

const middleware2 = (() => (request, context, runtime) => {
  return (response) => {
    setCookie(response, "foo", "bar");
    // also support all tough-cookie options when creating a cookie
    // see https://github.com/salesforce/tough-cookie/blob/master/api/docs/tough-cookie.createcookieoptions.md
    setCookie(response, "foo", "bar", {
      maxAge: 3600,
      // ...
    });
    
    deleteCookie(response, "foo");
    
    return response;
  }
}) satisfies Get<[], UniversalMiddleware>;
```
