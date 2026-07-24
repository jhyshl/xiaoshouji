function ot(t, e) {
  var r = {};
  for (var s in t) Object.prototype.hasOwnProperty.call(t, s) && e.indexOf(s) < 0 && (r[s] = t[s]);
  if (t != null && typeof Object.getOwnPropertySymbols == "function")
    for (var n = 0, s = Object.getOwnPropertySymbols(t); n < s.length; n++)
      e.indexOf(s[n]) < 0 && Object.prototype.propertyIsEnumerable.call(t, s[n]) && (r[s[n]] = t[s[n]]);
  return r;
}
function as(t, e, r, s) {
  function n(i) {
    return i instanceof r ? i : new r(function(a) {
      a(i);
    });
  }
  return new (r || (r = Promise))(function(i, a) {
    function o(h) {
      try {
        c(s.next(h));
      } catch (u) {
        a(u);
      }
    }
    function l(h) {
      try {
        c(s.throw(h));
      } catch (u) {
        a(u);
      }
    }
    function c(h) {
      h.done ? i(h.value) : n(h.value).then(o, l);
    }
    c((s = s.apply(t, e || [])).next());
  });
}
const os = (t) => t ? (...e) => t(...e) : (...e) => fetch(...e);
class Nt extends Error {
  constructor(e, r = "FunctionsError", s) {
    super(e), this.name = r, this.context = s;
  }
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      context: this.context
    };
  }
}
class ls extends Nt {
  constructor(e) {
    super("Failed to send a request to the Edge Function", "FunctionsFetchError", e);
  }
}
class Mt extends Nt {
  constructor(e) {
    super("Relay Error invoking the Edge Function", "FunctionsRelayError", e);
  }
}
class Kt extends Nt {
  constructor(e) {
    super("Edge Function returned a non-2xx status code", "FunctionsHttpError", e);
  }
}
var _t;
(function(t) {
  t.Any = "any", t.ApNortheast1 = "ap-northeast-1", t.ApNortheast2 = "ap-northeast-2", t.ApSouth1 = "ap-south-1", t.ApSoutheast1 = "ap-southeast-1", t.ApSoutheast2 = "ap-southeast-2", t.CaCentral1 = "ca-central-1", t.EuCentral1 = "eu-central-1", t.EuWest1 = "eu-west-1", t.EuWest2 = "eu-west-2", t.EuWest3 = "eu-west-3", t.SaEast1 = "sa-east-1", t.UsEast1 = "us-east-1", t.UsWest1 = "us-west-1", t.UsWest2 = "us-west-2";
})(_t || (_t = {}));
class cs {
  /**
   * Creates a new Functions client bound to an Edge Functions URL.
   *
   * @example Using supabase-js (recommended)
   * ```ts
   * import { createClient } from '@supabase/supabase-js'
   *
   * const supabase = createClient('https://xyzcompany.supabase.co', 'your-publishable-key')
   * const { data, error } = await supabase.functions.invoke('hello-world')
   * ```
   *
   * @category Edge Functions
   *
   * @example Standalone import for bundle-sensitive environments
   * ```ts
   * import { FunctionsClient, FunctionRegion } from '@supabase/functions-js'
   *
   * const functions = new FunctionsClient('https://xyzcompany.supabase.co/functions/v1', {
   *   headers: { apikey: 'your-publishable-key' },
   *   region: FunctionRegion.UsEast1,
   * })
   * ```
   */
  constructor(e, { headers: r = {}, customFetch: s, region: n = _t.Any } = {}) {
    this.url = e, this.headers = r, this.region = n, this.fetch = os(s);
  }
  /**
   * Updates the authorization header
   * @param token - the new jwt token sent in the authorisation header
   *
   * @category Edge Functions
   *
   * @example Setting the authorization header
   * ```ts
   * functions.setAuth(session.access_token)
   * ```
   */
  setAuth(e) {
    this.headers.Authorization = `Bearer ${e}`;
  }
  /**
   * Invokes a function
   * @param functionName - The name of the Function to invoke.
   * @param options - Options for invoking the Function.
   * @example
   * ```ts
   * const { data, error } = await functions.invoke('hello-world', {
   *   body: { name: 'Ada' },
   * })
   * ```
   *
   * @category Edge Functions
   *
   * @remarks
   * - The API key is sent in the `apikey` header. The `Authorization` header is reserved
   *   for the signed-in user's JWT (or a custom auth token) â€” when there is no session, a
   *   new-format API key (`sb_publishable_â€¦` / `sb_secret_â€¦`) is not sent as a Bearer token.
   * - Invoke params generally match the [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) spec.
   * - When you pass in a body to your function, we automatically attach the Content-Type header for `Blob`, `ArrayBuffer`, `File`, `FormData` and `String`. If it doesn't match any of these types we assume the payload is `json`, serialize it and attach the `Content-Type` header as `application/json`. You can override this behavior by passing in a `Content-Type` header of your own.
   * - Responses are automatically parsed as `json`, `blob` and `form-data` depending on the `Content-Type` header sent by your function. Responses are parsed as `text` by default.
   *
   * @example Basic invocation
   * ```js
   * const { data, error } = await supabase.functions.invoke('hello', {
   *   body: { foo: 'bar' }
   * })
   * ```
   *
   * @exampleDescription Error handling
   * A `FunctionsHttpError` error is returned if your function throws an error, `FunctionsRelayError` if the Supabase Relay has an error processing your function and `FunctionsFetchError` if there is a network error in calling your function. Log the full error object so fields like `name`, `context`, and any structured body aren't hidden.
   *
   * @example Error handling
   * ```js
   * import { FunctionsHttpError, FunctionsRelayError, FunctionsFetchError } from "@supabase/supabase-js";
   *
   * const { data, error } = await supabase.functions.invoke('hello', {
   *   headers: {
   *     "my-custom-header": 'my-custom-header-value'
   *   },
   *   body: { foo: 'bar' }
   * })
   *
   * if (error instanceof FunctionsHttpError) {
   *   const errorMessage = await error.context.json()
   *   console.error('Function returned an error', errorMessage)
   * } else if (error instanceof FunctionsRelayError) {
   *   console.error('Relay error:', error)
   * } else if (error instanceof FunctionsFetchError) {
   *   console.error('Fetch error:', error)
   * }
   * ```
   *
   * @exampleDescription Passing custom headers
   * You can pass custom headers to your function. Note: supabase-js automatically passes the `Authorization` header with the signed in user's JWT.
   *
   * @example Passing custom headers
   * ```js
   * const { data, error } = await supabase.functions.invoke('hello', {
   *   headers: {
   *     "my-custom-header": 'my-custom-header-value'
   *   },
   *   body: { foo: 'bar' }
   * })
   * ```
   *
   * @exampleDescription Calling with DELETE HTTP verb
   * You can also set the HTTP verb to `DELETE` when calling your Edge Function.
   *
   * @example Calling with DELETE HTTP verb
   * ```js
   * const { data, error } = await supabase.functions.invoke('hello', {
   *   headers: {
   *     "my-custom-header": 'my-custom-header-value'
   *   },
   *   body: { foo: 'bar' },
   *   method: 'DELETE'
   * })
   * ```
   *
   * @exampleDescription Invoking a Function in the UsEast1 region
   * Here are the available regions:
   * - `FunctionRegion.Any`
   * - `FunctionRegion.ApNortheast1`
   * - `FunctionRegion.ApNortheast2`
   * - `FunctionRegion.ApSouth1`
   * - `FunctionRegion.ApSoutheast1`
   * - `FunctionRegion.ApSoutheast2`
   * - `FunctionRegion.CaCentral1`
   * - `FunctionRegion.EuCentral1`
   * - `FunctionRegion.EuWest1`
   * - `FunctionRegion.EuWest2`
   * - `FunctionRegion.EuWest3`
   * - `FunctionRegion.SaEast1`
   * - `FunctionRegion.UsEast1`
   * - `FunctionRegion.UsWest1`
   * - `FunctionRegion.UsWest2`
   *
   * @example Invoking a Function in the UsEast1 region
   * ```js
   * import { createClient, FunctionRegion } from '@supabase/supabase-js'
   *
   * const { data, error } = await supabase.functions.invoke('hello', {
   *   body: { foo: 'bar' },
   *   region: FunctionRegion.UsEast1
   * })
   * ```
   *
   * @exampleDescription Calling with GET HTTP verb
   * You can also set the HTTP verb to `GET` when calling your Edge Function.
   *
   * @example Calling with GET HTTP verb
   * ```js
   * const { data, error } = await supabase.functions.invoke('hello', {
   *   headers: {
   *     "my-custom-header": 'my-custom-header-value'
   *   },
   *   method: 'GET'
   * })
   * ```
   *
   * @example Standalone client invoke
   * ```ts
   * const { data, error } = await functions.invoke('hello-world', {
   *   body: { name: 'Ada' },
   * })
   * ```
   */
  invoke(e) {
    return as(this, arguments, void 0, function* (r, s = {}) {
      var n, i;
      let a, o, l;
      try {
        const { headers: c, method: h, body: u, signal: d, timeout: f } = s;
        let p = {}, { region: y } = s;
        y || (y = this.region);
        const v = new URL(`${this.url}/${r}`);
        y && y !== "any" && (p["x-region"] = y, v.searchParams.set("forceFunctionRegion", y));
        let w;
        const S = !!c && Object.keys(c).some((Se) => Se.toLowerCase() === "content-type");
        u && !S ? typeof Blob < "u" && u instanceof Blob || u instanceof ArrayBuffer ? (p["Content-Type"] = "application/octet-stream", w = u) : typeof u == "string" ? (p["Content-Type"] = "text/plain", w = u) : typeof FormData < "u" && u instanceof FormData ? w = u : (p["Content-Type"] = "application/json", w = JSON.stringify(u)) : u && typeof u != "string" && !(typeof Blob < "u" && u instanceof Blob) && !(u instanceof ArrayBuffer) && !(typeof FormData < "u" && u instanceof FormData) ? w = JSON.stringify(u) : w = u;
        let _ = d;
        f && (o = new AbortController(), a = setTimeout(() => o.abort(), f), d ? (_ = o.signal, l = () => o.abort(), d.addEventListener("abort", l)) : _ = o.signal);
        const E = yield this.fetch(v.toString(), {
          method: h || "POST",
          // headers priority is (high to low):
          // 1. invoke-level headers
          // 2. client-level headers
          // 3. default Content-Type header
          headers: Object.assign(Object.assign(Object.assign({}, p), this.headers), c),
          body: w,
          signal: _
        }).catch((Se) => {
          throw new ls(Se);
        }), U = E.headers.get("x-relay-error");
        if (U && U === "true")
          throw new Mt(E);
        if (!E.ok)
          throw new Kt(E);
        let T = ((n = E.headers.get("Content-Type")) !== null && n !== void 0 ? n : "text/plain").split(";")[0].trim().toLowerCase(), R;
        return T === "application/json" ? R = yield E.json() : T === "application/octet-stream" || T === "application/pdf" ? R = yield E.blob() : T === "text/event-stream" ? R = E : T === "multipart/form-data" ? R = yield E.formData() : R = yield E.text(), { data: R, error: null, response: E };
      } catch (c) {
        return {
          data: null,
          error: c,
          response: c instanceof Kt || c instanceof Mt ? c.context : void 0
        };
      } finally {
        a && clearTimeout(a), l && ((i = s.signal) === null || i === void 0 || i.removeEventListener("abort", l));
      }
    });
  }
}
const Cr = 3, Ft = (t) => Math.min(1e3 * 2 ** t, 3e4), us = [520, 503], Pr = [
  "GET",
  "HEAD",
  "OPTIONS"
];
var Wt = class extends Error {
  /**
  * @example
  * ```ts
  * import PostgrestError from '@supabase/postgrest-js'
  *
  * throw new PostgrestError({
  *   message: 'Row level security prevented the request',
  *   details: 'RLS denied the insert',
  *   hint: 'Check your policies',
  *   code: 'PGRST301',
  * })
  * ```
  */
  constructor(t) {
    super(t.message), this.name = "PostgrestError", this.details = t.details, this.hint = t.hint, this.code = t.code;
  }
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      details: this.details,
      hint: this.hint,
      code: this.code
    };
  }
};
function Vt(t, e) {
  return new Promise((r) => {
    if (e?.aborted) {
      r();
      return;
    }
    const s = setTimeout(() => {
      e?.removeEventListener("abort", n), r();
    }, t);
    function n() {
      clearTimeout(s), r();
    }
    e?.addEventListener("abort", n);
  });
}
function hs(t, e, r, s) {
  return !(!s || r >= Cr || !Pr.includes(t) || !us.includes(e));
}
var ds = class {
  /**
  * Creates a builder configured for a specific PostgREST request.
  *
  * @example Using supabase-js (recommended)
  * ```ts
  * import { createClient } from '@supabase/supabase-js'
  *
  * const supabase = createClient('https://xyzcompany.supabase.co', 'your-publishable-key')
  * const { data, error } = await supabase.from('users').select('*')
  * ```
  *
  * @category Database
  *
  * @example Standalone import for bundle-sensitive environments
  * ```ts
  * import { PostgrestQueryBuilder } from '@supabase/postgrest-js'
  *
  * const builder = new PostgrestQueryBuilder(
  *   new URL('https://xyzcompany.supabase.co/rest/v1/users'),
  *   { headers: new Headers({ apikey: 'your-publishable-key' }) }
  * )
  * ```
  */
  constructor(t) {
    var e, r, s, n, i;
    this.shouldThrowOnError = !1, this.retryEnabled = !0, this.method = t.method, this.url = t.url, this.headers = new Headers(t.headers), this.schema = t.schema, this.body = t.body, this.shouldThrowOnError = (e = t.shouldThrowOnError) !== null && e !== void 0 ? e : !1, this.signal = t.signal, this.isMaybeSingle = (r = t.isMaybeSingle) !== null && r !== void 0 ? r : !1, this.shouldStripNulls = (s = t.shouldStripNulls) !== null && s !== void 0 ? s : !1, this.urlLengthLimit = (n = t.urlLengthLimit) !== null && n !== void 0 ? n : 8e3, this.retryEnabled = (i = t.retry) !== null && i !== void 0 ? i : !0, t.fetch ? this.fetch = t.fetch : this.fetch = fetch;
  }
  /**
  * If there's an error with the query, throwOnError will reject the promise by
  * throwing the error instead of returning it as part of a successful response.
  *
  * {@link https://github.com/supabase/supabase-js/issues/92}
  *
  * @category Database
  * @subcategory Using modifiers
  */
  throwOnError() {
    return this.shouldThrowOnError = !0, this;
  }
  /**
  * Strip null values from the response data. Properties with `null` values
  * will be omitted from the returned JSON objects.
  *
  * Requires PostgREST 11.2.0+.
  *
  * {@link https://docs.postgrest.org/en/stable/references/api/resource_representation.html#stripped-nulls}
  *
  * @category Database
  * @subcategory Using modifiers
  *
  * @example With `select()`
  * ```ts
  * const { data, error } = await supabase
  *   .from('characters')
  *   .select()
  *   .stripNulls()
  * ```
  *
  * @exampleSql With `select()`
  * ```sql
  * create table
  *   characters (id int8 primary key, name text, bio text);
  *
  * insert into
  *   characters (id, name, bio)
  * values
  *   (1, 'Luke', null),
  *   (2, 'Leia', 'Princess of Alderaan');
  * ```
  *
  * @exampleResponse With `select()`
  * ```json
  * {
  *   "data": [
  *     {
  *       "id": 1,
  *       "name": "Luke"
  *     },
  *     {
  *       "id": 2,
  *       "name": "Leia",
  *       "bio": "Princess of Alderaan"
  *     }
  *   ],
  *   "status": 200,
  *   "statusText": "OK"
  * }
  * ```
  */
  stripNulls() {
    if (this.headers.get("Accept") === "text/csv") throw new Error("strÛMz÷{h‘éì¶»§q«^tKˆÂˆ‹‹˜KˆÛİ™\™Y›İYÚˆËˆÛÛ[ˆ‹œİ[[X\Hˆ‹ˆÛİ\˜ÙR\Úˆ‹œÛİ\˜ÙR\Úˆ‹ˆİ[NˆH\‹œİ[[X\Tİ[KˆX[X[QY]Y]ˆ‹›X[X[QY]Y]ˆKˆÂˆÚ[™ˆœİ[[X\Kœ™\XÙH‹ˆ]™\›Ú\˜Xİ\’Ù^Nˆ]™\›Ú\˜Xİ\’Ù^KˆØ]™RYˆœØ]™RYˆÛİ™\™Y›İYÚˆÂˆBˆ
K]ØZ]ÙJˆ]™\›‹œ™XÙ[‹ˆKˆÂˆ‹‹˜Kˆİ\ĞY\ˆËˆ›İ[™Îˆ‚ˆKˆÂˆÚ[™ˆœ™XÙ[œ™\XÙH‹ˆ]™\›Ú\˜Xİ\’Ù^Nˆ]™\›Ú\˜Xİ\’Ù^KˆØ]™RYˆœØ]™RYˆ›ÛÜÛİ[ˆ‹›[™İˆBˆ
NÂŸB˜\Ş[˜È[˜İ[Ûˆ]
Âˆ›Ü˜ÙU\ØYˆHLKˆ[İÔİ[[X\NˆHHLˆ™Yœ™\Ú\ÜÙ]ÎˆˆHLBŸHHßJHÂˆYˆ
Ë˜\ŞH^

K™[˜X›Y
H™]\›Âˆ]ÎÂˆHÂˆÈH]ØZ]

NÂˆHØ]Ú
ŠHÂˆË›\İ\œ›ÜˆH‹›Y\ÜØYÙHº+îùcå¹odùbcz b¹i*yi,z-)H‹ÛÛœÛÛK™\œ›ÜŠÉÒ_WH˜Z[YÈ™XYHİ\œ™[Ú]ŠKŠ
NÂˆ™]\›ÂˆBˆYˆ
Ë˜İ\œ™[HË\ÊHÂˆŠ
NÂˆ™]\›ÂˆBˆË˜\ŞHHLË›\İ\œ›ÜˆHˆÂˆHÂˆÛÛœİˆH
Ë˜ÛÛ^˜Ú]
KHH
Ë˜ÛÛ^
NÂˆYˆ

ˆË˜İ\œ™[\ÜÙ]ÒÙ^HOOHË]™\›Ú\˜Xİ\’Ù^HYË˜İ\œ™[\ÜÙ]ÊH	‰ˆ
Ë˜İ\œ™[\ÜÙ]ÈH]ØZ]XJÊKË˜İ\œ™[\ÜÙ]ÒÙ^HHË]™\›Ú\˜Xİ\’Ù^JK™J
JBˆHÂˆ]ØZ]ØJËË˜İ\œ™[\ÜÙ]ÊNÂˆHØ]Ú

HÂˆË˜\ÜÙ]İ]K™\œ›ÜˆH›Y\ÜØYÙHº)äº"lº-a9¥¦yd#9«iyi,z-)H‹ÛÛœÛÛK™\œ›ÜŠÉÒ_WH\ÜÙ]Ş[˜È˜Z[Y
NÂˆBˆÛÛœİHH]ØZ]YJ”ÓÓ‹œİš[™ÚYJŠJKÈHX]›Z[ŠŒX]›X^
‹[X™\Š

Kš[\˜[
HŒ
JKHX]™›ÛÜŠ‹›[™İÈÊH
ˆËÈHÈ]ØZ]YJ”ÓÓ‹œİš[™ÚYJ‹œÛXÙJ
JJHˆˆ‹H[X™\ŠK˜Ûİ™\™Y›İYÚ
HOOHKœÛİ\˜ÙR\ÚOOHÎÂˆYˆ
H	‰ˆ

K˜]]Ôİ[[X\š^™H	‰ˆ	‰ˆˆ	‰ˆ

K›[Ù[
HÂˆÛÛœİHX]›Z[Š[X™\ŠK˜Ûİ™\™Y›İYÚ
H
KˆHÈ]ØZ]YJ”ÓÓ‹œİš[™ÚYJ‹œÛXÙJ
JJHˆˆ‹Hˆ	‰ˆ	‰ˆKœİ[[X\H	‰ˆKœÛİ\˜ÙR\ÚOOH‹HHÈ‹œÛXÙJ
Hˆ‹œÛXÙJ
NÂˆKœİ[[X\HH]ØZ]JÂˆ™]š[İ\Ôİ[[X\NˆÈKœİ[[X\Hˆˆ‹ˆ›İ[™ÎˆBˆJKK˜Ûİ™\™Y›İYÚHKœÛİ\˜ÙR\ÚHËKœİ[[X\Tİ[HHLKK\]Y]H]K››İÊ
KK›X[X[QY]Y]HÙJË˜ÛÛ^
NÂˆH[ÙH	‰ˆOOHÈ
Kœİ[[X\HHˆ‹K˜Ûİ™\™Y›İYÚHKœÛİ\˜ÙR\ÚHˆ‹Kœİ[[X\Tİ[HHLKK\]Y]H]K››İÊ
KK›X[X[QY]Y]HÙJË˜ÛÛ^
JHˆ	‰ˆˆ	‰ˆ
Kœİ[[X\Tİ[HHLK\]Y]H]K››İÊ
KÙJË˜ÛÛ^
JNÂˆÛÛœİHH]ØZ]YJˆ”ÓÓ‹œİš[™ÚYJÂˆØ]™RYˆËœØ]™RYˆ]™R\ÚˆKˆİ[[X\NˆKœİ[[X\Hˆ‹ˆÛİ™\™Y›İYÚˆ[X™\ŠK˜Ûİ™\™Y›İYÚ
HˆÛİ\˜ÙR\ÚˆKœÛİ\˜ÙR\Úˆ‹ˆİ[[X\Tİ[NˆHZKœİ[[X\Tİ[BˆJBˆ
NÂˆ™J
H	‰ˆ
K›\İ\ØYY\ÚOOHJH	‰ˆ
]ØZ]JË‹JKK›\İ\ØYY\ÚHKK›\İ\ØYY]H]K››İÊ
KÙJË˜ÛÛ^
JKË˜ÛÛ›™XİYH™J
NÂˆHØ]Ú
ŠHÂˆË›\İ\œ›ÜˆH‹›Y\ÜØYÙH¹d#9«iyi,z-)H‹ÛÛœÛÛK™\œ›ÜŠÉÒ_WXŠNÂˆHš[˜[HÂˆË˜\ŞHHLKŠ
NÂˆBŸB™[˜İ[ÛˆYJHßJHÂˆÛX\•[Y[İ]
Ë[Y\ŠKË[Y\ˆHÙ][Y[İ]


HOˆ]

KL
NÂŸB˜\Ş[˜È[˜İ[ÛˆXJ
HÂˆË›\İ\œ›ÜˆHˆÂˆÛÛœİH	ÛØØ][Û‹›ÜšYÚ[ŸIÛØØ][Û‹œ]˜[Y_XÈ\œ›ÜˆHHH]ØZ]Ë˜]]œÚYÛ’[•Ú]Ğ]]
Âˆ›İšY\ˆ™\ØÛÜ™‹ˆÜ[ÛœÎˆÂˆ™Y\™XİÎˆˆØÛÜ\Îˆ™İZ[ÈİZ[Ë›Y[X™\œËœ™XY‚ˆBˆJNÂˆH	‰ˆ
Ë›\İ\œ›ÜˆHK›Y\ÜØYÙKŠ
JNÂŸB˜\Ş[˜È[˜İ[Ûˆ	J
HÂˆ]ØZ]Ë˜]]œÚYÛ“İ]

KËœÙ\ÜÚ[ÛˆH[Ëœ›Ùš[HH[Ë˜ÛÛ›™XİYHLKŠ
NÂŸB˜\Ş[˜È[˜İ[Ûˆ˜J
HÂˆÛÛœİH

KHH
]
KˆH]ØZ]™]Ú
œÊ˜\U\››[Ù[ÈŠKÂˆXY\œÎˆHÈÈ]]Üš^˜][Ûˆ™X\™\ˆ	Ù_XHˆßBˆJNÂˆYˆ
\‹›ÚÊH›İÈ™]È\œ›ÜŠ9ª(yg¢ù£©ycèú/å9fçˆ	Ü‹œİ]\ßX
NÂˆÛÛœİÈH]ØZ]‹šœÛÛŠ
KˆH\œ˜^Kš\Ğ\œ˜^JÏË™]JHÈË™]Hˆ\œ˜^Kš\Ğ\œ˜^JÏË›[Ù[ÊHÈË›[Ù[Èˆ\œ˜^Kš\Ğ\œ˜^JÊHÈÈˆ×NÂˆ›[Ù[Ü[ÛœÈHÂˆ‹‹›™]ÈÙ]
ˆ‹›X\

JHOˆ\[ÙˆHOHœİš[™ÈˆÈHˆOËšYOË›˜[YJK™š[\Š›ÛÛX[ŠBˆ
BˆKœÛÜ

K›[Ù[Ü[ÛœËš[˜ÛY\Ê›[Ù[
H
›[Ù[H›[Ù[Ü[ÛœÖÌHˆŠK™J
KŠ
NÂŸB™[˜İ[ÛˆÙJHHˆ‹ˆHˆŠHÂˆÛÛœİÈHØİ[Y[˜Ü™X]Q[[Y[

NÂˆ™]\›ˆH	‰ˆ
Ë˜Û\ÜÓ˜[YHHJKˆ	‰ˆ
Ë^ÛÛ[HŠKÎÂŸB™[˜İ[ÛˆYJJHÂˆÛÛœİˆHÙJ›X™[‹›YšY[ŠNÂˆ™]\›ˆ‹˜\[™
ÙJœÜ[ˆ‹ˆ‹
KJKÂŸB™[˜İ[Ûˆİ
KŠHÂˆÛÛœİÈHØİ[Y[˜Ü™X]Q[[Y[
š[œ]ŠNÂˆ™]\›ˆË\HHË˜[YHHHÏÈˆ‹Ë˜Y]™[\İ[™\Š˜Ú[™ÙH‹

HOˆŠË˜[YJJKÎÂŸB™[˜İ[ÛˆŠ
HÂˆYˆ
YËœ[™[
H™]\›ÂˆÛÛœİH

KHHË˜İ\œ™[ˆHHÈ
K˜ÛÛ^˜Ú]
Hˆ×KÈHHÈ
K˜ÛÛ^
Hˆ[ÂˆYˆ
Ëœİ]\Ë^ÛÛ[HË˜\ŞHÈ¹«hùg*9i!9ä!¸ )ˆˆˆË›\İ\œ›ÜˆÈË›\İ\œ›Üˆˆ™J
HÈ‘\ØÛÜ™9mìºj£:+àH0­È9.¤yêëùcëùå*ˆˆËœÙ\ÜÚ[ÛˆÈ¹mì¹ænùoe{ï#9ëbyo¡yé/¹c.ºj£:+àHˆˆ¹l&¹§*¹ænùoeH‹Ëœİ]\Ë˜Û\ÜÓ\İÙÙÛJ™\œ›Üˆ‹HYË›\İ\œ›ÜŠKË™]Z[Ë^ÛÛ[HHÈ	ÙK˜Ú\˜Xİ\“˜[Y_H0­È	ÙKœØ]™S˜[Y_H0­È	Ü‹›[™İH9©o0­È9mì¹ .ùîäÈ	ÜË˜Ûİ™\™Y›İYÚH9©oˆº+íùab9¢dùo 9cez)äº"lº b¹i*ykf9¨hÈ‹Ë˜\ÜÙ]ÊHÂˆÛÛœİÈ›ÛÚÜÎˆ[šY\ÎˆË[˜Ø]Y[šY\Îˆ\œ›ÜˆHHHË˜\ÜÙ]İ]NÂˆË˜\ÜÙ]Ë^ÛÛ[HHÈ	İHÈ:-a9¥¦yd#9«iyi,z-){ï&‰İ_H0­ÈˆˆŸz)äº"l¹chymìº+îùcåˆ0­È	ÛH9§+9îäyk¦¹.%¹åc9.iˆ0­È	ØßH9.*¹§hyæë‰ÚÈ0­È	ÚH9§hz/áúeoùa¡yk®ymì¹¢*¹¥«XˆˆŸXˆ¹¢dùo :)äº"lº b¹i*yd#¹/&º!ê¹bª:+îùcåº)äº"l¹chy.#¹îäyk¦¹.%¹åc9.iˆÂˆBˆËœİ[[X\K˜[YHHÏËœİ[[X\HˆÂˆÛÛœİˆHËœ[™[œ]Y\TÙ[XİÜŠ–Ù]KXXİ[Û[ÙÚ[—HŠKHHËœ[™[œ]Y\TÙ[XİÜŠ–Ù]KXXİ[Û[ÙÛİ]HŠNÂˆ‹šY[ˆHHYËœÙ\ÜÚ[Û‹KšY[ˆHYËœÙ\ÜÚ[ÛÂˆÛÛœİHHËœ[™[œ]Y\TÙ[XİÜŠ–Ù]KYšY[[[Ù[HŠNÂˆKœ™\XÙPÚ[™[Š
NÂˆÛÛœİÈHØİ[Y[˜Ü™X]Q[[Y[
›Ü[ÛˆŠNÂˆË˜[YHHˆ‹Ë^ÛÛ[H›[Ù[Ü[ÛœË›[™İÈº`"y¢êyª(yg¢Èˆˆ¹ab9¢âycå¹ª(yg¢È‹K˜\[™
ÊNÂˆ›Üˆ
ÛÛœİÙˆ›[Ù[Ü[ÛœÊHÂˆÛÛœİÈHØİ[Y[˜Ü™X]Q[[Y[
›Ü[ÛˆŠNÂˆË˜[YHHË^ÛÛ[HK˜\[™
ÊNÂˆBˆK˜[YHH›[Ù[ˆÂŸB™[˜İ[Ûˆ	

HÂˆÛÛœİHHËœ[™[ÂˆYˆ
JHÂˆYˆ
]
HÂˆK›Ü[ˆ	‰ˆ\[ÙˆK˜ÛÜÙHOH™[˜İ[ÛˆˆÈK˜ÛÜÙJ
HˆKœ™[[İ™P]šX]J›Ü[ˆŠKKœÙ]]šX]J˜\šXKZY[ˆ‹YHŠNÂˆ™]\›ÂˆBˆYˆ
YK›Ü[ŠBˆHÂˆKœÚİÓ[Ù[

NÂˆHØ]Ú
ŠHÂˆÛÛœÛÛKØ\›ŠÉÒ_WH[Ù[\Ü^H˜Z[YÈ\Ú[™È›Û‹[[Ù[˜[˜XÚØŠKKœÙ]]šX]J›Ü[ˆ‹ˆŠNÂˆBˆKœÙ]]šX]J˜\šXKZY[ˆ‹™˜[ÙHŠKŠ
K

K[Š
ŠHOˆÂˆË˜İ\œ™[H‹Š
NÂˆJK˜Ø]Ú

ŠHOˆÂˆË›\İ\œ›ÜˆH‹›Y\ÜØYÙHº+îùcå¹odùbcz b¹i*yi,z-)H‹ÛÛœÛÛK™\œ›ÜŠÉÒ_WH˜Z[YÈ™Yœ™\Ú[™[ŠKŠ
NÂˆJNÂˆBŸB™[˜İ[ÛˆÜŠ
HÂˆËZSØœÙ\™\ˆYØİ[Y[˜›ÙH
ËZSØœÙ\™\ˆH™]È]]][Û“ØœÙ\™\Š

HOˆÂˆYˆ
YËœ[™[Ëš\ĞÛÛ›™XİYYË›][˜Ú\Ëš\ĞÛÛ›™XİY
HÂˆ\Ê
NÂˆ™]\›ÂˆBˆËœÙ][™ÜÑ[OËš\ĞÛÛ›™XİY]

NÂˆJKËZSØœÙ\™\‹›ØœÙ\™JØİ[Y[˜›ÙKÈÚ[\İˆLİX™YNˆLJJNÂŸB™[˜İ[Ûˆ]

HÂˆYˆ
ËœÙ][™ÜÑ[OËš\ĞÛÛ›™XİY
H™]\›ˆLÂˆÛÛœİHØİ[Y[œ]Y\TÙ[XİÜŠˆÛ[™\Û™K\Ş[˜Ë\Ù][™ÜËY[HŠNÂˆYˆ
Ëš\ĞÛÛ›™XİY
Bˆ™]\›ˆËœÙ][™ÜÑ[HHLÂˆÛÛœİHHØİ[Y[œ]Y\TÙ[XİÜŠˆÙ^[œÚ[Ûœ×ÜÙ][™ÜÈŠHØİ[Y[œ]Y\TÙ[XİÜŠˆÙ^[œÚ[Ûœ×ÜÙ][™ÜÌˆŠNÂˆYˆ
YJBˆ™]\›ˆÛX\•[Y[İ]
Ë›[İ[[Y\ŠKË›[İ[[Y\ˆHÙ][Y[İ]
]
KLNÂˆÛX\•[Y[İ]
Ë›[İ[[Y\ŠKË›[İ[[Y\ˆH[ÂˆÛÛœİˆHÙJ™]ˆ‹™^[œÚ[Û—ØÛÛZ[™\ˆ\Ù][™ÜËY[HŠNÂˆ™]\›ˆ‹šYH›[™\Û™K\Ş[˜Ë\Ù][™ÜËY[H‹‹š[›™\’SHˆ]ˆÛ\ÜÏHš[›[™KY˜]Ù\ˆ‚ˆ]ˆÛ\ÜÏHš[›[™KY˜]Ù\‹]ÙÙÛH[›[™KY˜]Ù\‹ZXY\ˆ‚ˆ“[™TÛ™H9l#ù¢bù§.¹d#9«iOØ‚ˆ]ˆÛ\ÜÏHš[›[™KY˜]Ù\‹ZXÛÛˆ˜K\ÛÛY˜KXÚ\˜ÛKXÚ]œ›Û‹YİÛˆİÛˆÙ]‚ˆÙ]‚ˆ]ˆÛ\ÜÏHš[›[™KY˜]Ù\‹XÛÛ[‚ˆ¹d#9«iyodùbcz)äº"l¸à yîäyk¦¹.%¹åc9.i¸à z b¹i*y©o9l`¹d£:f-¹«­y .ùîäøà Ü‚ˆ]Ûˆ\OH˜]ÛˆˆÛ\ÜÏH›Y[WØ]Ûˆˆ]KXXİ[ÛH›Ü[‹[[™\Û™H‚ˆ9¢dùo 9l#ù¢bù§.¹d#9«iy£©ùb-ºgh¹§oÂˆØ]Û‚ˆÙ]‚ˆÙ]‚ˆ‹œ]Y\TÙ[XİÜŠ–Ù]KXXİ[Û[Ü[‹[[™\Û™WHŠK˜Y]™[\İ[™\Š˜ÛXÚÈ‹
ÊHOˆÂˆËœ™]™[Y˜][

KËœİÜ›ÜYØ][ÛŠ
K	
L
NÂˆJKK˜\[™
ŠKËœÙ][™ÜÑ[HH‹LÂŸB™[˜İ[Ûˆ\Ê
HÂˆYˆ
Ëœ[™[Ëš\ĞÛÛ›™XİY	‰ˆË›][˜Ú\Ëš\ĞÛÛ›™XİY
HÂˆ]

KÜŠ
NÂˆ™]\›ÂˆBˆË›][˜Ú\Ëœ™[[İ™J
KËœ[™[Ëœ™[[İ™J
NÂˆÛÛœİHÙJ˜]Ûˆ‹›\Ş[˜Ë[][˜Ú\ˆ‹¸¡áŠNÂˆ\HH˜]Ûˆ‹]HH¹l#ù¢bù§.¹d#9«iHÂˆÛÛœİHHÙJ™X[ÙÈ‹›]]™\›‹\[™[ŠNÂˆKœÙ]]šX]J˜\šXKZY[ˆ‹YHŠKKœÙ]]šX]J˜\šXK[X™[‹¹l#ù¢bù§.¹d#9«iHŠKKš[›™\’SHˆXY\‚ˆ]ÛX[“S‘TÓ‘H‘PÑRU‘TÜÛX[¹l#ù¢bù§.¹d#9«iOÚÙ]‚ˆ]Ûˆ\OH˜]Ûˆˆ]KXXİ[ÛH˜ÛÜÙH°åÏØ]Û‚ˆÚXY\‚ˆÛ\ÜÏH›\İ]\ÈÜ‚ˆÛ\ÜÏH›Y]Z[ÈÜ‚ˆÛ\ÜÏH›X\ÜÙ]ÈÜ‚ˆ]ˆÛ\ÜÏH›X]]XXİ[ÛœÈ‚ˆ]Ûˆ\OH˜]Ûˆˆ]KXXİ[ÛH›ÙÚ[ˆ¹/oùå*\ØÛÜ™9ænùoeOØ]Û‚ˆ]Ûˆ\OH˜]Ûˆˆ]KXXİ[ÛH›ÙÛİ]º` 9aî¹ænùoeOØ]Û‚ˆÙ]‚ˆÙXİ[ÛˆÛ\ÜÏH›\ÙXİ[ÛˆX\HÜÙXİ[Û‚ˆÙXİ[ÛˆÛ\ÜÏH›\ÙXİ[Ûˆ‚ˆ]ˆÛ\ÜÏH›\ÙXİ[Û‹]]Hİ›Û™Ï¹odùbczf-¹«­y .ùîäÏÜİ›Û™ÏÛX[¹/çykf9g*:/æy.*ºadºi¡¹kf9¨hù§+9g,ÜÛX[Ù]‚ˆ^\™XHÛ\ÜÏH›\İ[[X\Hˆ›İÜÏHˆXÙZÛ\Hº/¯¹b,9 .ùîäù©o9l`¹d#º!ê¹bª9å'ù¢$;ï#9.gùcëù.éy¢bùbª9ï%º/¤Hİ^\™XO‚ˆ]ˆÛ\ÜÏH›\›İÈ‚ˆ]Ûˆ\OH˜]Ûˆˆ]KXXİ[ÛHœØ]™K\İ[[X\H¹/çykf9nmº)¡¹æå¹.¤yêëÏØ]Û‚ˆ]Ûˆ\OH˜]Ûˆˆ]KXXİ[ÛHœŞ[˜Ë[›İÈ¹êâùclú+îùcå¹nm¹d#9«iOØ]Û‚ˆÙ]‚ˆÜÙXİ[Û‚ˆØİ[Y[˜›ÙK˜\[™
JKË›][˜Ú\ˆHËœ[™[HKËœİ]\ÈHKœ]Y\TÙ[XİÜŠ‹›\İ]\ÈŠKË™]Z[ÈHKœ]Y\TÙ[XİÜŠ‹›Y]Z[ÈŠKË˜\ÜÙ]ÈHKœ]Y\TÙ[XİÜŠ‹›X\ÜÙ]ÈŠKËœİ[[X\HHKœ]Y\TÙ[XİÜŠ‹›\İ[[X\HŠK]

KÜŠ
NÂˆÛÛœİˆH

KÈHKœ]Y\TÙ[XİÜŠ‹›X\HŠKˆHİ
\›‹‹˜\U\›
JHOˆÂˆ

K˜\U\›HKš[J
K™J
NÂˆJKHHİ
ˆœ\ÜİÛÜ™‹ˆ
]
Kˆ
JHOˆœÊ]JBˆ
KHHØİ[Y[˜Ü™X]Q[[Y[
œÙ[XİŠNÂˆK™]\Ù]™šY[H›[Ù[‹K˜Y]™[\İ[™\Š˜Ú[™ÙH‹

HOˆÂˆ

K›[Ù[HK˜[YK™J
NÂˆJNÂˆÛÛœİÈHİ
›[X™\ˆ‹‹š[\˜[
JHOˆÂˆ

Kš[\˜[HX]›Z[ŠŒX]›X^
‹[X™\ŠJHŒ
JK™J
NÂˆJNÂˆË›Z[ˆHŒˆ‹Ë›X^HŒŒÂˆÛÛœİHØİ[Y[˜Ü™X]Q[[Y[
š[œ]ŠNÂˆ\HH˜ÚXÚØ›Ş‹˜ÚXÚÙYH‹˜]]Ôİ[[X\š^™K˜Y]™[\İ[™\Š˜Ú[™ÙH‹

HOˆÂˆ

K˜]]Ôİ[[X\š^™HH˜ÚXÚÙY™J
NÂˆJNÂˆÛÛœİÈHÙJ˜]Ûˆ‹ˆ‹¹¢âycå¹ª(yg¢ÈŠNÂˆË\HH˜]Ûˆ‹Ë˜Y]™[\İ[™\Šˆ˜ÛXÚÈ‹ˆ

HOˆ˜J
K˜Ø]Ú

JHOˆÂˆË›\İ\œ›ÜˆHK›Y\ÜØYÙKŠ
NÂˆJBˆ
NÂˆÛÛœİHÙJ™]ˆ‹›[[Ù[\›İÈŠNÂˆ˜\[™
KÊKË˜\[™
ˆÙJ™]ˆ‹›\ÙXİ[Û‹]]H‹º!ê¹bª9 .ùîäÈTHŠKˆYJTH9g,9g`‹ŠKˆYJTHÙ^{ï"9cê¹kf9odùbcy­cú)â9fj;ï"H‹JKˆYJ¹ª(yg¢È‹
KˆYJ¹«ãùi&¹l$y©o9 .ùîäù. 9«(H‹ÊKˆYJ¹d+ùå*:!ê¹bª9 .ùîäÈ‹
Bˆ
K˜Y]™[\İ[™\Š˜ÛXÚÈ‹

HOˆÂˆ	
YK›Ü[ŠNÂˆJKKœ]Y\TÙ[XİÜŠ–Ù]KXXİ[ÛXÛÜÙWHŠK˜Y]™[\İ[™\Š˜ÛXÚÈ‹

HOˆÂˆ	
LJNÂˆJKK˜Y]™[\İ[™\Š˜ÛÜÙH‹

HOˆÂˆKœÙ]]šX]J˜\šXKZY[ˆ‹YHŠNÂˆJKKœ]Y\TÙ[XİÜŠ–Ù]KXXİ[Û[ÙÚ[—HŠK˜Y]™[\İ[™\Š˜ÛXÚÈ‹XJKKœ]Y\TÙ[XİÜŠ–Ù]KXXİ[Û[ÙÛİ]HŠK˜Y]™[\İ[™\Š˜ÛXÚÈ‹	JKKœ]Y\TÙ[XİÜŠ–Ù]KXXİ[Û\Ş[˜Ë[›İ×HŠK˜Y]™[\İ[™\Šˆ˜ÛXÚÈ‹ˆ

HOˆ]
È›Ü˜ÙU\ØYˆL[İÔİ[[X\NˆL™Yœ™\Ú\ÜÙ]ÎˆLJBˆ
KKœ]Y\TÙ[XİÜŠ–Ù]KXXİ[Û\Ø]™K\İ[[X\WHŠK˜Y]™[\İ[™\Š˜ÛXÚÈ‹\Ş[˜È

HOˆÂˆÛÛœİHH]ØZ]

NÂˆYˆ
]JH™]\›ÂˆÛÛœİH
K˜ÛÛ^
KˆH
K˜ÛÛ^˜Ú]
KHX]›Z[ŠŒX]›X^
‹[X™\Š

Kš[\˜[
HŒ
JKHHX]™›ÛÜŠ‹›[™İÈ
H
ˆÂˆœİ[[X\HHËœİ[[X\K˜[YKš[J
K˜Ûİ™\™Y›İYÚHKœÛİ\˜ÙR\ÚHHÈ]ØZ]YJ”ÓÓ‹œİš[™ÚYJ‹œÛXÙJJJJHˆˆ‹œİ[[X\Tİ[HHLK›X[X[QY]Y]H]K››İÊ
K\]Y]H]K››İÊ
KÙJK˜ÛÛ^
K]ØZ]]
È›Ü˜ÙU\ØYˆL[İÔİ[[X\NˆLHJNÂˆJKŠ
NÂŸB™[˜İ[ÛˆJ
HÂˆYˆ
Ë™]™[Ğ›İ[™
H™]\›ˆLÂˆÛÛœİHË˜ÛÛ^Ë™]™[Ûİ\˜ÙKHHË˜ÛÛ^Ë™]™[\\ÎÂˆ™]\›ˆ\[ÙˆË›ÛˆOH™[˜İ[ÛˆˆYHÈLHˆ
ÂˆK“QTÔĞQÑWÔÑS•ˆK“QTÔĞQÑWÔ‘PÑRU‘QˆK“QTÔĞQÑWÑQUQˆK“QTÔĞQÑWÑSUQˆK“QTÔĞQÑWÕTUQˆK“QTÔĞQÑWÔÕÒTQˆK‘ÑS‘TUSÓ—ÑS‘QˆK™š[\Š›ÛÛX[ŠK™›Ü‘XXÚ

ŠHOˆ›ÛŠ‹

HOˆYJ
JJKÂˆKÒTPÕT—ÑQUQˆKÒTPÕT—ÔÑSPÕQˆK•ÓÔ“S‘“×ÕTUQˆK•ÓÔ“S‘“×ÔÑUS‘Ô×ÕTUQˆK™š[\Š›ÛÛX[ŠK™›Ü‘XXÚ
ˆ
ŠHOˆ›ÛŠˆ‹ˆ

HOˆYJÈ›Ü˜ÙU\ØYˆL™Yœ™\Ú\ÜÙ]ÎˆLJBˆ
Bˆ
KKÒUĞÒS‘ÑQ	‰ˆ›ÛŠˆKÒUĞÒS‘ÑQˆ

HOˆYJÈ›Ü˜ÙU\ØYˆL™Yœ™\Ú\ÜÙ]ÎˆLJBˆ
KË™]™[Ğ›İ[™HLL
NÂŸB™[˜İ[Ûˆ

HÂˆYˆ
J
JHÂˆÛX\•[Y[İ]
Ë™]™[Õ[Y\ŠKË™]™[Õ[Y\ˆH[Âˆ™]\›ÂˆBˆÛX\•[Y[İ]
Ë™]™[Õ[Y\ŠKË™]™[Õ[Y\ˆHÙ][Y[İ]


HOˆÂˆHÂˆË˜ÛÛ^H]

K

NÂˆHØ]Ú

HÂˆÛÛœÛÛK™XYÊÉÒ_WHØZ][™È›ÜˆÚ[U]™\›ˆ]™[Ø
K

NÂˆBˆK
NÂŸB˜\Ş[˜È[˜İ[Ûˆ˜J
HÂˆË˜]]›Û]]İ]PÚ[™ÙJ
KŠHOˆÂˆÙ][Y[İ]
\Ş[˜È

HOˆÂˆYˆ
ËœÙ\ÜÚ[ÛˆH‹Ëœ›Ùš[HH[Ë˜ÛÛ›™XİYHLK\ŠHÂˆŠ
NÂˆ™]\›ÂˆBˆHÂˆ‹œ›İšY\—İÚÙ[ˆ	‰ˆ]ØZ]XJŠNÂˆÛÛœİÈ]NˆÈHH]ØZ]Ë˜]]™Ù]Ù\ÜÚ[ÛŠ
NÂˆËœÙ\ÜÚ[ÛˆHËœÙ\ÜÚ[Û‹]ØZ]Š
K™J
H	‰ˆ
]ØZ]\Š
K]ØZ]œŠ
KË˜ÛÛ›™XİYHLYJÈ›Ü˜ÙU\ØYˆL™Yœ™\Ú\ÜÙ]ÎˆLJJNÂˆHØ]Ú
ÊHÂˆË›\İ\œ›ÜˆHË›Y\ÜØYÙNÂˆBˆŠ
NÂˆK
NÂˆJNÂˆÛÛœİÈ]NˆHH]ØZ]Ë˜]]™Ù]Ù\ÜÚ[ÛŠ
NÂˆËœÙ\ÜÚ[ÛˆHœÙ\ÜÚ[Û‹ËœÙ\ÜÚ[Ûˆ	‰ˆ
]ØZ]Š
K˜Ø]Ú

JHOˆÂˆË›\İ\œ›ÜˆHK›Y\ÜØYÙNÂˆJK™J
H	‰ˆ
]ØZ]\Š
K]ØZ]œŠ
KË˜ÛÛ›™XİYHL
JNÂŸB˜\Ş[˜È[˜İ[ÛˆXJHMYLÊHÂˆÛÛœİHH]K››İÊ
NÂˆ›Üˆ
ÈYÛØ˜[\Ë”Ú[U]™\›Ë™Ù]ÛÛ^YØİ[Y[˜›ÙNÈ
HÂˆYˆ
]K››İÊ
HHHˆ
Bˆ›İÈ™]È\œ›ÜŠ¹ëbyo¡HÚ[U]™\›ˆ9b'yiâùc%º-¡y¥íˆŠNÂˆ]ØZ]™]È›ÛZ\ÙJ
ŠHOˆÙ][Y[İ]
‹L
JNÂˆBŸB˜\Ş[˜È[˜İ[Ûˆ

HÂˆ]ØZ]XJ
KË˜ÛÛ^H]

K\Ê
NÂŸB˜\Ş[˜È[˜İ[ÛˆJ
HÂˆYˆ
YËš[š]X[^™Y
HÂˆ]ØZ]

KËš[š]X[^™YHL

KË™]šXÙHHÜÊ
K

NÂˆHÂˆ]ØZ]˜J
NÂˆHØ]Ú

HÂˆË›\İ\œ›ÜˆH›Y\ÜØYÙH¹ænùoeyâ­¹  yb'yiâùc%¹i,z-)H‹ÛÛœÛÛK™\œ›ÜŠÉÒ_WH]][š]X[^˜][Ûˆ˜Z[Y
KŠ
NÂˆBˆYJÈ›Ü˜ÙU\ØYˆL™Yœ™\Ú\ÜÙ]ÎˆLJKÛÛœÛÛK›ÙÊÉÒ_WH‰ÖœŸHØYY
NÂˆBŸB›]H[Â™[˜İ[Ûˆ]

HÂˆ™]\›ˆHJ
K˜Ø]Ú


HOˆÂˆ›İÈËš[š]X[^™YHLKÛÛœÛÛK™\œ›ÜŠÉÒ_WH[š]X[^˜][Ûˆ˜Z[Y
KË›\İ\œ›ÜˆH›Y\ÜØYÙH¹b'yiâùc%¹i,z-)H‹Š
KÂˆJKÂŸB˜\Ş[˜È[˜İ[ÛˆJ
HÂˆ™]\›ˆ]ØZ]

K]

NÂŸB˜\Ş[˜È[˜İ[Ûˆ˜J
HÂˆ™]\›ˆ]ØZ]

K]

NÂŸBœ]Y]YSZXÜ›İ\ÚÊ

HOˆÂˆ]

K˜Ø]Ú


HOˆÂˆH[ÂˆJNÂŸJNÂ™^ÜÂˆH\ÈÛXİ]˜]Kˆ˜H\ÈÛ‘[˜X›BŸNÂ