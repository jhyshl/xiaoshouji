function ct(t, e) {
  var r = {};
  for (var s in t) Object.prototype.hasOwnProperty.call(t, s) && e.indexOf(s) < 0 && (r[s] = t[s]);
  if (t != null && typeof Object.getOwnPropertySymbols == "function")
    for (var n = 0, s = Object.getOwnPropertySymbols(t); n < s.length; n++)
      e.indexOf(s[n]) < 0 && Object.prototype.propertyIsEnumerable.call(t, s[n]) && (r[s[n]] = t[s[n]]);
  return r;
}
function ds(t, e, r, s) {
  function n(i) {
    return i instanceof r ? i : new r(function(a) {
      a(i);
    });
  }
  return new (r || (r = Promise))(function(i, a) {
    function o(u) {
      try {
        c(s.next(u));
      } catch (h) {
        a(h);
      }
    }
    function l(u) {
      try {
        c(s.throw(u));
      } catch (h) {
        a(h);
      }
    }
    function c(u) {
      u.done ? i(u.value) : n(u.value).then(o, l);
    }
    c((s = s.apply(t, e || [])).next());
  });
}
const fs = (t) => t ? (...e) => t(...e) : (...e) => fetch(...e);
class Ut extends Error {
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
class ps extends Ut {
  constructor(e) {
    super("Failed to send a request to the Edge Function", "FunctionsFetchError", e);
  }
}
class Ht extends Ut {
  constructor(e) {
    super("Relay Error invoking the Edge Function", "FunctionsRelayError", e);
  }
}
class Kt extends Ut {
  constructor(e) {
    super("Edge Function returned a non-2xx status code", "FunctionsHttpError", e);
  }
}
var kt;
(function(t) {
  t.Any = "any", t.ApNortheast1 = "ap-northeast-1", t.ApNortheast2 = "ap-northeast-2", t.ApSouth1 = "ap-south-1", t.ApSoutheast1 = "ap-southeast-1", t.ApSoutheast2 = "ap-southeast-2", t.CaCentral1 = "ca-central-1", t.EuCentral1 = "eu-central-1", t.EuWest1 = "eu-west-1", t.EuWest2 = "eu-west-2", t.EuWest3 = "eu-west-3", t.SaEast1 = "sa-east-1", t.UsEast1 = "us-east-1", t.UsWest1 = "us-west-1", t.UsWest2 = "us-west-2";
})(kt || (kt = {}));
class gs {
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
  constructor(e, { headers: r = {}, customFetch: s, region: n = kt.Any } = {}) {
    this.url = e, this.headers = r, this.region = n, this.fetch = fs(s);
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
    return ds(this, arguments, void 0, function* (r, s = {}) {
      var n, i;
      let a, o, l;
      try {
        const { headers: c, method: u, body: h, signal: d, timeout: f } = s;
        let g = {}, { region: y } = s;
        y || (y = this.region);
        const m = new URL(`${this.url}/${r}`);
        y && y !== "any" && (g["x-region"] = y, m.searchParams.set("forceFunctionRegion", y));
        let w;
        const S = !!c && Object.keys(c).some((Ee) => Ee.toLowerCase() === "content-type");
        h && !S ? typeof Blob < "u" && h instanceof Blob || h instanceof ArrayBuffer ? (g["Content-Type"] = "application/octet-stream", w = h) : typeof h == "string" ? (g["Content-Type"] = "text/plain", w = h) : typeof FormData < "u" && h instanceof FormData ? w = h : (g["Content-Type"] = "application/json", w = JSON.stringify(h)) : h && typeof h != "string" && !(typeof Blob < "u" && h instanceof Blob) && !(h instanceof ArrayBuffer) && !(typeof FormData < "u" && h instanceof FormData) ? w = JSON.stringify(h) : w = h;
        let _ = d;
        f && (o = new AbortController(), a = setTimeout(() => o.abort(), f), d ? (_ = o.signal, l = () => o.abort(), d.addEventListener("abort", l)) : _ = o.signal);
        const E = yield this.fetch(m.toString(), {
          method: u || "POST",
          // headers priority is (high to low):
          // 1. invoke-level headers
          // 2. client-level headers
          // 3. default Content-Type header
          headers: Object.assign(Object.assign(Object.assign({}, g), this.headers), c),
          body: w,
          signal: _
        }).catch((Ee) => {
          throw new ps(Ee);
        }), U = E.headers.get("x-relay-error");
        if (U && U === "true")
          throw new Ht(E);
        if (!E.ok)
          throw new Kt(E);
        let T = ((n = E.headers.get("Content-Type")) !== null && n !== void 0 ? n : "text/plain").split(";")[0].trim().toLowerCase(), R;
        return T === "application/json" ? R = yield E.json() : T === "application/octet-stream" || T === "application/pdf" ? R = yield E.blob() : T === "text/event-stream" ? R = E : T === "multipart/form-data" ? R = yield E.formData() : R = yield E.text(), { data: R, error: null, response: E };
      } catch (c) {
        return {
          data: null,
          error: c,
          response: c instanceof Kt || c instanceof Ht ? c.context : void 0
        };
      } finally {
        a && clearTimeout(a), l && ((i = s.signal) === null || i === void 0 || i.removeEventListener("abort", l));
      }
    });
  }
}
const Pr = 3, Ft = (t) => Math.min(1e3 * 2 ** t, 3e4), ys = [520, 503], Ir = [
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
function ms(t, e, r, s) {
  return !(!s || r >= Pr || !Ir.includes(t) || !ys.includes(e));
}
var vs = class {
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
    if (this.headers.get("Accept") === "text/csv") throw new Error("strÛMüÛ›h‘éì¶»§q«^u[X™\ŠK˜Ûİ™\™Y›İYÚ
HˆÛİ\˜ÙR\ÚˆKœÛİ\˜ÙR\Úˆ‹ˆİ[[X\Tİ[NˆHZKœİ[[X\Tİ[BˆJBˆ
NÂˆÊ
H	‰ˆ
K›\İ\ØYY\ÚOOH
H	‰ˆ
]ØZ]\ÊË‹JKK›\İ\ØYY\ÚHK›\İ\ØYY]H]K››İÊ
KÙJË˜ÛÛ^
JK]ØZ]XJËJK˜ÛÛ›™XİYHÊ
NÂˆHØ]Ú
ŠHÂˆ›\İ\œ›ÜˆH‹›Y\ÜØYÙH¹d#9«iyi,z-)H‹ÛÛœÛÛK™\œ›ÜŠÉĞßWXŠNÂˆHš[˜[HÂˆ˜\ŞHHLKŠ
NÂˆBŸB™[˜İ[ÛˆYJHßJHÂˆÛX\•[Y[İ]
[Y\ŠK[Y\ˆHÙ][Y[İ]


HOˆ]

KL
NÂŸB˜\Ş[˜È[˜İ[ÛˆXJ
HÂˆ›\İ\œ›ÜˆHˆ‹›Ø]]\›Hˆ‹˜]]][˜Ú[™ÈHLŠ
NÂˆÛÛœİH	ÛØØ][Û‹›ÜšYÚ[ŸIÛØØ][Û‹œ]˜[Y_XÂˆ]HH[ÂˆHÂˆHHÚ[™İË›Ü[Š˜X›İ]˜›[šÈ‹—Ø›[šÈŠNÂˆÛÛœİÈ]Nˆ‹\œ›ÜˆÈHH]ØZ]K˜]]œÚYÛ’[•Ú]Ğ]]
Âˆ›İšY\ˆ™\ØÛÜ™‹ˆÜ[ÛœÎˆÂˆ™Y\™XİÎˆˆØÛÜ\Îˆ™İZ[ÈİZ[Ë›Y[X™\œËœ™XY‹ˆÚÚ\œ›İÜÙ\”™Y\™XİˆLˆBˆJNÂˆYˆ
ÊH›İÈÎÂˆYˆ
\Ë\›
H›İÈ™]È\œ›ÜŠ¹§*º ïyå'ù¢$\ØÛÜ™9ænùoezdï¹£©HŠNÂˆYˆ
›Ø]]\›H‹\›H	‰ˆYK˜ÛÜÙY
HÂˆK›ØØ][Û‹œ™\XÙJ‹\›
NÂˆHÂˆK›Ü[™\ˆH[ÂˆHØ]ÚÂˆBˆH[ÙBˆ›\İ\œ›ÜˆH¹ìîùîçù§*º!ê¹bª9¢dùo 9i%º`ê9­cú)â9fj;ï#:+íùà®yaîù."ù¥®zdï¹£©yîéùîëyænùoeHÂˆHØ]Ú
ŠHÂˆOË˜ÛÜÙOËŠ
K›\İ\œ›ÜˆHË›Y\ÜØYÙH‘\ØÛÜ™9ænùoeyd+ùbª9i,z-)HÂˆHš[˜[HÂˆ˜]]][˜Ú[™ÈHLKŠ
NÂˆBŸB˜\Ş[˜È[˜İ[ÛˆJ
HÂˆ]ØZ]K˜]]œÚYÛ“İ]

KœÙ\ÜÚ[ÛˆH[œ›Ùš[HH[˜ÛÛ›™XİYHLKŠ
NÂŸB˜\Ş[˜È[˜İ[ÛˆØJ
HÂˆÛÛœİH

KHH
]
KˆH]ØZ]™]Ú
Ê˜\U\››[Ù[ÈŠKÂˆXY\œÎˆHÈÈ]]Üš^˜][Ûˆ™X\™\ˆ	Ù_XHˆßBˆJNÂˆYˆ
\‹›ÚÊH›İÈ™]È\œ›ÜŠ9ª(yg¢ù£©ycèú/å9fçˆ	Ü‹œİ]\ßX
NÂˆÛÛœİÈH]ØZ]‹šœÛÛŠ
KˆH\œ˜^Kš\Ğ\œ˜^JÏË™]JHÈË™]Hˆ\œ˜^Kš\Ğ\œ˜^JÏË›[Ù[ÊHÈË›[Ù[Èˆ\œ˜^Kš\Ğ\œ˜^JÊHÈÈˆ×NÂˆ›[Ù[Ü[ÛœÈHÂˆ‹‹›™]ÈÙ]
ˆ‹›X\

JHOˆ\[ÙˆHOHœİš[™ÈˆÈHˆOËšYOË›˜[YJK™š[\Š›ÛÛX[ŠBˆ
BˆKœÛÜ

K›[Ù[Ü[ÛœËš[˜ÛY\Ê›[Ù[
H
›[Ù[H›[Ù[Ü[ÛœÖÌHˆŠKÙJ
KŠ
NÂŸB™[˜İ[Ûˆ™JHHˆ‹ˆHˆŠHÂˆÛÛœİÈHØİ[Y[˜Ü™X]Q[[Y[

NÂˆ™]\›ˆH	‰ˆ
Ë˜Û\ÜÓ˜[YHHJKˆ	‰ˆ
Ë^ÛÛ[HŠKÎÂŸB™[˜İ[ÛˆYJJHÂˆÛÛœİˆH™J›X™[‹›YšY[ŠNÂˆ™]\›ˆ‹˜\[™
™JœÜ[ˆ‹ˆ‹
KJKÂŸB™[˜İ[Ûˆİ
KŠHÂˆÛÛœİÈHØİ[Y[˜Ü™X]Q[[Y[
š[œ]ŠNÂˆ™]\›ˆË\HHË˜[YHHHÏÈˆ‹Ë˜Y]™[\İ[™\Š˜Ú[™ÙH‹

HOˆŠË˜[YJJKÎÂŸB™[˜İ[ÛˆŠ
HÂˆYˆ
\œ[™[
H™]\›ÂˆÛÛœİH

KHH˜İ\œ™[ˆHHÈ
K˜ÛÛ^˜Ú]
Hˆ×KÈHHÈ]
K˜ÛÛ^
Hˆ[ÂˆYˆ
œİ]\Ë^ÛÛ[H˜\ŞHÈ¹«hùg*9i!9ä!¸ )ˆˆˆ˜]]][˜Ú[™ÈÈ¹«hùg*9i%º`ê9­cú)â9fj9.+y¢dùo \ØÛÜ™8 )ˆˆˆ›\İ\œ›ÜˆÈ›\İ\œ›Üˆˆ›Ø]]\›	‰ˆ\œÙ\ÜÚ[ÛˆÈ‘\ØÛÜ™9£¢9§`úhmymì¹¢dùo ;ï#9k£9¢$9d#º/å9fçºadºi¡ˆˆˆÊ
HÈ‘\ØÛÜ™9mìºj£:+àH0­È9.¤yêëùcëùå*ˆˆœÙ\ÜÚ[ÛˆÈ¹mì¹ænùoe{ï#9ëbyo¡yé/¹c.ºj£:+àHˆˆ¹l&¹§*¹ænùoeH‹œİ]\Ë˜Û\ÜÓ\İÙÙÛJ™\œ›Üˆ‹H\›\İ\œ›ÜŠK™]Z[Ë^ÛÛ[HHÈ	ÙK˜Ú\˜Xİ\“˜[Y_H0­È	ÙKœØ]™S˜[Y_H0­È	Ü‹›[™İH9©o0­È9mì¹ .ùîäÈ	ÜË˜Ûİ™\™Y›İYÚH9©oˆº+íùab9¢dùo 9cez)äº"lº b¹i*ykf9¨hÈ‹˜\ÜÙ]ÊHÂˆÛÛœİÈ›ÛÚÜÎˆK[šY\Îˆ[˜Ø]Y[šY\Îˆ\œ›ÜˆˆHH˜\ÜÙ]İ]NÂˆ˜\ÜÙ]Ë^ÛÛ[HHÈ	ÙˆÈ:-a9¥¦yd#9«iyi,z-){ï&‰ÙŸH0­ÈˆˆŸz)äº"l¹chymìº+îùcåˆ0­È	İ_H9§+9îäyk¦¹.%¹åc9.iˆ0­È	ÚH9.*¹§hyæë‰ÙÈ0­È	ÙH9§hz/áúeoùa¡yk®ymì¹¢*¹¥«XˆˆŸXˆ¹¢dùo :)äº"lº b¹i*yd#¹/&º!ê¹bª:+îùcåº)äº"l¹chy.#¹îäyk¦¹.%¹åc9.iˆÂˆBˆYˆ
›Y[[ÜTİ]\ÊHÂˆÛÛœİHHHJœÛ™SY[[ÜOËœÛ™Tİ[[X\OË˜ÛÛ[	‰ˆ\œÛ™SY[[ÜOËœÛ™Tİ[[X\OËœİ[JKH\œ˜^Kš\Ğ\œ˜^JœÛ™SY[[ÜOË›Y\ÜØYÙ\ÊHÈœÛ™SY[[ÜK›Y\ÜØYÙ\Ë›[™İˆÂˆ›Y[[ÜTİ]\Ë^ÛÛ[HHÈ:-ê9êëú+¬9oá»ï&ºadºi¡¹ .ùîäÉÜÏËœİ[[X\H	‰ˆ\ÏËœİ[[X\Tİ[HÈ¹mì¹¬ê9aiHˆˆ¹¦ ¹¥èŸH0­È9l#ù¢bù§.¹ .ùîäÉİHÈ¹mì¹¬ê9aiHˆˆ¹¦ ¹¥èŸH0­È9l#ù¢bù§.¹k§¹¥íˆ	ÚH9§hXˆº-ê9êëú+¬9oá»ï&¹ëbyo¡y¢dùo :)äº"lº b¹i*HÂˆBˆœİ[[X\K˜[YHHÏËœİ[[X\HˆÂˆÛÛœİˆHœ[™[œ]Y\TÙ[XİÜŠ–Ù]KXXİ[Û[ÙÚ[—HŠKHHœ[™[œ]Y\TÙ[XİÜŠ–Ù]KXXİ[Û[ÙÛİ]HŠKHHœ[™[œ]Y\TÙ[XİÜŠ‹›[Ø]]Z[ŠKÈHOËœ]Y\TÙ[XİÜŠ–Ù]KXXİ[Û[Ø]][[š×HŠNÂˆ‹šY[ˆHH\œÙ\ÜÚ[Û‹‹™\ØX›YH˜]]][˜Ú[™Ë‹^ÛÛ[H˜]]][˜Ú[™ÈÈ¹«hùg*9¢dùo \ØÛÜ™8 )ˆˆˆ¹/oùå*\ØÛÜ™9ænùoeH‹KšY[ˆH\œÙ\ÜÚ[Û‹H	‰ˆÈ	‰ˆ
KšY[ˆHH\œÙ\ÜÚ[Ûˆ\›Ø]]\›Ëš™YˆH›Ø]]\›ˆÈŠNÂˆÛÛœİHœ[™[œ]Y\TÙ[XİÜŠ–Ù]KYšY[[[Ù[HŠNÂˆœ™\XÙPÚ[™[Š
NÂˆÛÛœİÈHØİ[Y[˜Ü™X]Q[[Y[
›Ü[ÛˆŠNÂˆË˜[YHHˆ‹Ë^ÛÛ[H›[Ù[Ü[ÛœË›[™İÈº`"y¢êyª(yg¢Èˆˆ¹ab9¢âycå¹ª(yg¢È‹˜\[™
ÊNÂˆ›Üˆ
ÛÛœİHÙˆ›[Ù[Ü[ÛœÊHÂˆÛÛœİHØİ[Y[˜Ü™X]Q[[Y[
›Ü[ÛˆŠNÂˆ˜[YHHK^ÛÛ[HK˜\[™

NÂˆBˆ˜[YHH›[Ù[ˆÂŸB™[˜İ[Ûˆİ

HÂˆÛÛœİHHœ[™[ÂˆYˆ
JHÂˆYˆ
]
HÂˆKœÙ]]šX]J™]K[Ü[ˆ‹™˜[ÙHŠKKœÙ]]šX]J˜\šXKZY[ˆ‹YHŠNÂˆ™]\›ÂˆBˆKœÙ]]šX]J™]K[Ü[ˆ‹YHŠKKœÙ]]šX]J˜\šXKZY[ˆ‹™˜[ÙHŠKŠ
K

K[Š
ŠHOˆÂˆ˜İ\œ™[H‹Š
NÂˆJK˜Ø]Ú

ŠHOˆÂˆ›\İ\œ›ÜˆH‹›Y\ÜØYÙHº+îùcå¹odùbcz b¹i*yi,z-)H‹ÛÛœÛÛK™\œ›ÜŠÉĞßWH˜Z[YÈ™Yœ™\Ú[™[ŠKŠ
NÂˆJNÂˆBŸB™[˜İ[ÛˆÜŠ
HÂˆZSØœÙ\™\ˆYØİ[Y[˜›ÙH
ZSØœÙ\™\ˆH™]È]]][Û“ØœÙ\™\Š

HOˆÂˆYˆ
\œ[™[Ëš\ĞÛÛ›™XİY\›][˜Ú\Ëš\ĞÛÛ›™XİY
HÂˆÊ
NÂˆ™]\›ÂˆBˆ

NÂˆJKZSØœÙ\™\‹›ØœÙ\™JØİ[Y[˜›ÙKÈÚ[\İˆLİX™YNˆLJJNÂŸB™[˜İ[Ûˆ

HÂˆYˆ
œÙ][™ÜÑ[OËš\ĞÛÛ›™XİY
H™]\›ˆLÂˆÛÛœİHØİ[Y[œ]Y\TÙ[XİÜŠˆÛ[™\Û™K\Ş[˜Ë\Ù][™ÜËY[HŠNÂˆYˆ
Ëš\ĞÛÛ›™XİY
Bˆ™]\›ˆœÙ][™ÜÑ[HHLÂˆÛÛœİHHØİ[Y[œ]Y\TÙ[XİÜŠˆÙ^[œÚ[Ûœ×ÜÙ][™ÜÈŠHØİ[Y[œ]Y\TÙ[XİÜŠˆÙ^[œÚ[Ûœ×ÜÙ][™ÜÌˆŠNÂˆYˆ
YJBˆ™]\›ˆÛX\•[Y[İ]
›[İ[[Y\ŠK›[İ[[Y\ˆHÙ][Y[İ]

KLNÂˆÛX\•[Y[İ]
›[İ[[Y\ŠK›[İ[[Y\ˆH[ÂˆÛÛœİˆH™Jˆ™]ˆ‹ˆ™^[œÚ[Û—ØÛÛZ[™\ˆ\Ù][™ÜËY[H[™\Û™K\Ş[˜Ë\Ù][™ÜËY[H‚ˆ
NÂˆ™]\›ˆ‹šYH›[™\Û™K\Ş[˜Ë\Ù][™ÜËY[H‹‹š[›™\’SHˆ]ˆÛ\ÜÏHš[›[™KY˜]Ù\ˆ‚ˆ]ˆÛ\ÜÏHš[›[™KY˜]Ù\‹]ÙÙÛH[›[™KY˜]Ù\‹ZXY\ˆ‚ˆ“[™TÛ™H9l#ù¢bù§.¹d#9«iOØ‚ˆ]ˆÛ\ÜÏHš[›[™KY˜]Ù\‹ZXÛÛˆ˜K\ÛÛY˜KXÚ\˜ÛKXÚ]œ›Û‹YİÛˆİÛˆÙ]‚ˆÙ]‚ˆ]ˆÛ\ÜÏHš[›[™KY˜]Ù\‹XÛÛ[‚ˆ¹d#9«iyodùbcz)äº"l¸à yîäyk¦¹.%¹åc9.i¸à z b¹i*y©o9l`¹d£:f-¹«­y .ùîäøà Ü‚ˆ]Ûˆ\OH˜]ÛˆˆÛ\ÜÏH›Y[WØ]Ûˆˆ]KXXİ[ÛH›Ü[‹[[™\Û™H‚ˆ9¢dùo 9l#ù¢bù§.¹d#9«iy£©ùb-ºgh¹§oÂˆØ]Û‚ˆÙ]‚ˆÙ]‚ˆ‹œ]Y\TÙ[XİÜŠ–Ù]KXXİ[Û[Ü[‹[[™\Û™WHŠK˜Y]™[\İ[™\Š˜ÛXÚÈ‹
ÊHOˆÂˆËœ™]™[Y˜][

KËœİÜ›ÜYØ][ÛŠ
Kİ
L
NÂˆJKK˜\[™
ŠKœÙ][™ÜÑ[HH‹LÂŸB™[˜İ[ÛˆÊ
HÂˆYˆ
œ[™[Ëš\ĞÛÛ›™XİY	‰ˆ›][˜Ú\Ëš\ĞÛÛ›™XİY
HÂˆ

KÜŠ
NÂˆ™]\›ÂˆBˆÛÛœİHØİ[Y[œ]Y\TÙ[XİÜŠˆÛ[™\Û™K\Ş[˜Ë[][˜Ú\ˆŠNÂˆ›][˜Ú\ˆ	‰ˆ›][˜Ú\ˆOOH	‰ˆ›][˜Ú\‹œ™[[İ™J
Kœ[™[Ëœ™[[İ™J
NÂˆÛÛœİHH™J˜]Ûˆ‹›\Ş[˜Ë[][˜Ú\ˆ‹¸¡áŠNÂˆKšYH›[™\Û™K\Ş[˜Ë[][˜Ú\ˆ‹K\HH˜]Ûˆ‹K]HH¹l#ù¢bù§.¹d#9«iHÂˆÛÛœİˆH™JœÙXİ[Ûˆ‹›]]™\›‹\[™[ŠNÂˆ‹šYH›[™\Û™K\Ş[˜Ë\[™[‹‹œÙ]]šX]J™]K[Ü[ˆ‹™˜[ÙHŠK‹œÙ]]šX]J˜\šXKZY[ˆ‹YHŠK‹œÙ]]šX]Jœ›ÛH‹™X[ÙÈŠK‹œÙ]]šX]J˜\šXK[X™[‹¹l#ù¢bù§.¹d#9«iHŠK‹š[›™\’SHˆXY\‚ˆ]ÛX[“S‘TÓ‘H‘PÑRU‘TÜÛX[¹l#ù¢bù§.¹d#9«iOÚÙ]‚ˆ]Ûˆ\OH˜]Ûˆˆ]KXXİ[ÛH˜ÛÜÙH°åÏØ]Û‚ˆÚXY\‚ˆÛ\ÜÏH›\İ]\ÈÜ‚ˆÛ\ÜÏH›Y]Z[ÈÜ‚ˆÛ\ÜÏH›X\ÜÙ]ÈÜ‚ˆÛ\ÜÏH›[Y[[ÜK\İ]\ÈÜ‚ˆ]ˆÛ\ÜÏH›X]]XXİ[ÛœÈ‚ˆ]Ûˆ\OH˜]Ûˆˆ]KXXİ[ÛH›ÙÚ[ˆ¹/oùå*\ØÛÜ™9ænùoeOØ]Û‚ˆ]Ûˆ\OH˜]Ûˆˆ]KXXİ[ÛH›ÙÛİ]º` 9aî¹ænùoeOØ]Û‚ˆÙ]‚ˆÛ\ÜÏH›[Ø]]Z[ˆY[‚ˆ9¬¨y§"z!ê¹bª9¢dùo ;ï'ÂˆH]KXXİ[ÛH›Ø]][[šÈˆ\™Ù]H—Ø›[šÈˆ™[H™^\›˜[›ÛÜ[™\ˆ›Ü™Y™\œ™\ˆ‚ˆ9à®z/æzaã9g*9­cú)â9fj9.+yîéùîëH\ØÛÜ™9ænùoeBˆØO‚ˆÜ‚ˆÙXİ[ÛˆÛ\ÜÏH›\ÙXİ[ÛˆX\HÜÙXİ[Û‚ˆÙXİ[ÛˆÛ\ÜÏH›\ÙXİ[Ûˆ‚ˆ]ˆÛ\ÜÏH›\ÙXİ[Û‹]]Hİ›Û™Ï¹odùbczf-¹«­y .ùîäÏÜİ›Û™ÏÛX[¹/çykf9g*:/æy.*ºadºi¡¹kf9¨hù§+9g,ÜÛX[Ù]‚ˆ^\™XHÛ\ÜÏH›\İ[[X\Hˆ›İÜÏHˆXÙZÛ\Hº/¯¹b,9 .ùîäù©o9l`¹d#º!ê¹bª9å'ù¢$;ï#9.gùcëù.éy¢bùbª9ï%º/¤Hİ^\™XO‚ˆ]ˆÛ\ÜÏH›\›İÈ‚ˆ]Ûˆ\OH˜]Ûˆˆ]KXXİ[ÛHœØ]™K\İ[[X\H¹/çykf9nmº)¡¹æå¹.¤yêëÏØ]Û‚ˆ]Ûˆ\OH˜]Ûˆˆ]KXXİ[ÛHœŞ[˜Ë[›İÈ¹êâùclú+îùcå¹nm¹d#9«iOØ]Û‚ˆÙ]‚ˆÜÙXİ[Û‚ˆKš\ĞÛÛ›™XİYØİ[Y[˜›ÙK˜\[™
JKØİ[Y[˜›ÙK˜\[™
ŠK›][˜Ú\ˆHKœ[™[H‹œİ]\ÈH‹œ]Y\TÙ[XİÜŠ‹›\İ]\ÈŠK™]Z[ÈH‹œ]Y\TÙ[XİÜŠ‹›Y]Z[ÈŠK˜\ÜÙ]ÈH‹œ]Y\TÙ[XİÜŠ‹›X\ÜÙ]ÈŠK›Y[[ÜTİ]\ÈH‹œ]Y\TÙ[XİÜŠ‹›[Y[[ÜK\İ]\ÈŠKœİ[[X\HH‹œ]Y\TÙ[XİÜŠ‹›\İ[[X\HŠK

KÜŠ
NÂˆÛÛœİÈH

KˆH‹œ]Y\TÙ[XİÜŠ‹›X\HŠKHHİ
\›‹Ë˜\U\›

HOˆÂˆ

K˜\U\›Hš[J
KÙJ
NÂˆJKHHİ
ˆœ\ÜİÛÜ™‹ˆ
]
Kˆ

HOˆ\Ê]
Bˆ
KÈHØİ[Y[˜Ü™X]Q[[Y[
œÙ[XİŠNÂˆË™]\Ù]™šY[H›[Ù[‹Ë˜Y]™[\İ[™\Š˜Ú[™ÙH‹

HOˆÂˆ

K›[Ù[HË˜[YKÙJ
KYJÈ›Ü˜ÙU\ØYˆL[İÔİ[[X\NˆLJNÂˆJNÂˆÛÛœİHİ
›[X™\ˆ‹Ëš[\˜[

HOˆÂˆ

Kš[\˜[HX]›Z[ŠŒX]›X^
‹[X™\Š
HŒ
JKÙJ
KYJÈ›Ü˜ÙU\ØYˆL[İÔİ[[X\NˆLJNÂˆJNÂˆ›Z[ˆHŒˆ‹›X^HŒŒÂˆÛÛœİÈHØİ[Y[˜Ü™X]Q[[Y[
š[œ]ŠNÂˆË\HH˜ÚXÚØ›Ş‹Ë˜ÚXÚÙYHË˜]]Ôİ[[X\š^™KË˜Y]™[\İ[™\Š˜Ú[™ÙH‹

HOˆÂˆ

K˜]]Ôİ[[X\š^™HHË˜ÚXÚÙYÙJ
KYJÈ›Ü˜ÙU\ØYˆL[İÔİ[[X\NˆLJNÂˆJNÂˆÛÛœİHH™J˜]Ûˆ‹ˆ‹¹¢âycå¹ª(yg¢ÈŠNÂˆK\HH˜]Ûˆ‹K˜Y]™[\İ[™\Šˆ˜ÛXÚÈ‹ˆ

HOˆØJ
K˜Ø]Ú


HOˆÂˆ›\İ\œ›ÜˆH›Y\ÜØYÙKŠ
NÂˆJBˆ
NÂˆÛÛœİH™J™]ˆ‹›[[Ù[\›İÈŠNÂˆ˜\[™
ËJK‹˜\[™
ˆ™J™]ˆ‹›\ÙXİ[Û‹]]H‹º!ê¹bª9 .ùîäÈTHŠKˆYJTH9g,9g`‹JKˆYJTHÙ^{ï"9cê¹kf9odùbcy­cú)â9fj;ï"H‹JKˆYJ¹ª(yg¢È‹
KˆYJ¹«ãùi&¹l$y©o9 .ùîäù. 9«(H‹
KˆYJ¹d+ùå*:!ê¹bª9 .ùîäÈ‹ÊBˆ
KK™]\Ù]›[™\Û™P›Ûİİ˜\›İ[™OOHYHˆ	‰ˆK™]\Ù]›[™\Û™P\›İ[™OOHYHˆ	‰ˆ
K™]\Ù]›[™\Û™P\›İ[™HYH‹K˜Y]™[\İ[™\Š˜ÛXÚÈ‹

HOˆÂˆİ
‹™Ù]]šX]J™]K[Ü[ˆŠHOOHYHŠNÂˆJJK‹œ]Y\TÙ[XİÜŠ–Ù]KXXİ[ÛXÛÜÙWHŠK˜Y]™[\İ[™\Š˜ÛXÚÈ‹

HOˆÂˆİ
LJNÂˆJK‹œ]Y\TÙ[XİÜŠ–Ù]KXXİ[Û[ÙÚ[—HŠK˜Y]™[\İ[™\Š˜ÛXÚÈ‹XJK‹œ]Y\TÙ[XİÜŠ–Ù]KXXİ[Û[ÙÛİ]HŠK˜Y]™[\İ[™\Š˜ÛXÚÈ‹JK‹œ]Y\TÙ[XİÜŠ–Ù]KXXİ[Û\Ş[˜Ë[›İ×HŠK˜Y]™[\İ[™\Šˆ˜ÛXÚÈ‹ˆ

HOˆ]
È›Ü˜ÙU\ØYˆL[İÔİ[[X\NˆL™Yœ™\Ú\ÜÙ]ÎˆLJBˆ
K‹œ]Y\TÙ[XİÜŠ–Ù]KXXİ[Û\Ø]™K\İ[[X\WHŠK˜Y]™[\İ[™\Š˜ÛXÚÈ‹\Ş[˜È

HOˆÂˆÛÛœİH]ØZ]

NÂˆYˆ
Y
H™]\›ÂˆÛÛœİˆH]
˜ÛÛ^
KÈH
˜ÛÛ^˜Ú]
KHHX]›Z[ŠŒX]›X^
‹[X™\Š

Kš[\˜[
HŒ
JKHHX]™›ÛÜŠË›[™İÈJH
ˆNÂˆ‹œİ[[X\HHœİ[[X\K˜[YKš[J
K‹˜Ûİ™\™Y›İYÚHK‹œÛİ\˜ÙR\ÚHHÈ]ØZ]Š”ÓÓ‹œİš[™ÚYJËœÛXÙJJJJHˆˆ‹‹œİ[[X\Tİ[HHLK‹›X[X[QY]Y]H]K››İÊ
K‹\]Y]H]K››İÊ
KÙJ˜ÛÛ^
K]ØZ]]
È›Ü˜ÙU\ØYˆL[İÔİ[[X\NˆLHJNÂˆJKŠ
NÂŸB˜\Ş[˜È[˜İ[Ûˆ˜J
HÂˆYˆ
œİ[[X\T™\]Y\İXİ]™H^

K™[˜X›Y
H™]\›ÂˆÛÛœİH]K››İÊ
H
È™MÂˆ›Üˆ
È˜\ŞH	‰ˆ]K››İÊ
HÈ
Bˆ]ØZ]™]È›ÛZ\ÙJ
JHOˆÙ][Y[İ]
KL
JNÂˆ˜\ŞHœİ[[X\T™\]Y\İXİ]™H]ØZ]]
È›Ü˜ÙU\ØYˆL[İÔİ[[X\NˆLJNÂŸB™[˜İ[ÛˆØJ
HÂˆYˆ
™]™[Ğ›İ[™
H™]\›ˆLÂˆÛÛœİH˜ÛÛ^Ë™]™[Ûİ\˜ÙKHH˜ÛÛ^Ë™]™[\\ÎÂˆ™]\›ˆ\[ÙˆË›ÛˆOH™[˜İ[ÛˆˆYHÈLHˆ
ÂˆK“QTÔĞQÑWÔÑS•ˆK“QTÔĞQÑWÔ‘PÑRU‘QˆK“QTÔĞQÑWÑQUQˆK“QTÔĞQÑWÑSUQˆK“QTÔĞQÑWÕTUQˆK“QTÔĞQÑWÔÕÒTQˆK‘ÑS‘TUSÓ—ÑS‘QˆK™š[\Š›ÛÛX[ŠK™›Ü‘XXÚ

ŠHOˆ›ÛŠ‹

HOˆYJ
JJKK‘ÑS‘TUSÓ—ĞQ•T—ĞÓÓSPS‘È	‰ˆ›ÛŠK‘ÑS‘TUSÓ—ĞQ•T—ĞÓÓSPS‘Ë˜JKÂˆKÒTPÕT—ÑQUQˆKÒTPÕT—ÔÑSPÕQˆK•ÓÔ“S‘“×ÕTUQˆK•ÓÔ“S‘“×ÔÑUS‘Ô×ÕTUQˆK™š[\Š›ÛÛX[ŠK™›Ü‘XXÚ
ˆ
ŠHOˆ›ÛŠˆ‹ˆ

HOˆYJÈ›Ü˜ÙU\ØYˆL™Yœ™\Ú\ÜÙ]ÎˆLJBˆ
Bˆ
KKÒUĞÒS‘ÑQ	‰ˆ›ÛŠKÒUĞÒS‘ÑQ

HOˆÂˆÜÊ
KYJÈ›Ü˜ÙU\ØYˆL™Yœ™\Ú\ÜÙ]ÎˆLJNÂˆJK™]™[Ğ›İ[™HLL
NÂŸB™[˜İ[Ûˆ

HÂˆYˆ
ØJ
JHÂˆÛX\•[Y[İ]
™]™[Õ[Y\ŠK™]™[Õ[Y\ˆH[Âˆ™]\›ÂˆBˆÛX\•[Y[İ]
™]™[Õ[Y\ŠK™]™[Õ[Y\ˆHÙ][Y[İ]


HOˆÂˆHÂˆ˜ÛÛ^H

K

NÂˆHØ]Ú

HÂˆÛÛœÛÛK™XYÊÉĞßWHØZ][™È›ÜˆÚ[U]™\›ˆ]™[Ø
K

NÂˆBˆK
NÂŸB˜\Ş[˜È[˜İ[Ûˆ˜J
HÂˆK˜]]›Û]]İ]PÚ[™ÙJ
KŠHOˆÂˆÙ][Y[İ]
\Ş[˜È

HOˆÂˆYˆ
œÙ\ÜÚ[ÛˆH‹œ›Ùš[HH[˜ÛÛ›™XİYHLKˆ	‰ˆ
›Ø]]\›HˆŠK\ŠHÂˆŠ
NÂˆ™]\›ÂˆBˆHÂˆ‹œ›İšY\—İÚÙ[ˆ	‰ˆ]ØZ]	JŠNÂˆÛÛœİÈ]NˆÈHH]ØZ]K˜]]™Ù]Ù\ÜÚ[ÛŠ
NÂˆœÙ\ÜÚ[ÛˆHËœÙ\ÜÚ[Û‹]ØZ]Š
KÊ
H	‰ˆ
]ØZ]\Š
K]ØZ]œŠ
K˜ÛÛ›™XİYHLYJÈ›Ü˜ÙU\ØYˆL™Yœ™\Ú\ÜÙ]ÎˆLJJNÂˆHØ]Ú
ÊHÂˆ›\İ\œ›ÜˆHË›Y\ÜØYÙNÂˆBˆŠ
NÂˆK
NÂˆJNÂˆÛÛœİÈ]NˆHH]ØZ]K˜]]™Ù]Ù\ÜÚ[ÛŠ
NÂˆœÙ\ÜÚ[ÛˆHœÙ\ÜÚ[Û‹œÙ\ÜÚ[Ûˆ	‰ˆ
]ØZ]Š
K˜Ø]Ú

JHOˆÂˆ›\İ\œ›ÜˆHK›Y\ÜØYÙNÂˆJKÊ
H	‰ˆ
]ØZ]\Š
K]ØZ]œŠ
K˜ÛÛ›™XİYHL
JNÂŸB˜\Ş[˜È[˜İ[Ûˆ˜JHMYLÊHÂˆÛÛœİHH]K››İÊ
NÂˆ›Üˆ
ÈYÛØ˜[\Ë”Ú[U]™\›Ë™Ù]ÛÛ^YØİ[Y[˜›ÙNÈ
HÂˆYˆ
]K››İÊ
HHHˆ
Bˆ›İÈ™]È\œ›ÜŠ¹ëbyo¡HÚ[U]™\›ˆ9b'yiâùc%º-¡y¥íˆŠNÂˆ]ØZ]™]È›ÛZ\ÙJ
ŠHOˆÙ][Y[İ]
‹L
JNÂˆBŸB˜\Ş[˜È[˜İ[Ûˆ

HÂˆ]ØZ]˜J
K˜ÛÛ^H

KÊ
NÂŸB˜\Ş[˜È[˜İ[Ûˆ˜J
HÂˆYˆ
\š[š]X[^™Y
HÂˆ]ØZ]

Kš[š]X[^™YHL

K™]šXÙHHÜÊ
K

NÂˆHÂˆ]ØZ]˜J
NÂˆHØ]Ú

HÂˆ›\İ\œ›ÜˆH›Y\ÜØYÙH¹ænùoeyâ­¹  yb'yiâùc%¹i,z-)H‹ÛÛœÛÛK™\œ›ÜŠÉĞßWH]][š]X[^˜][Ûˆ˜Z[Y
KŠ
NÂˆBˆYJÈ›Ü˜ÙU\ØYˆL™Yœ™\Ú\ÜÙ]ÎˆLJKÛÛœÛÛK›ÙÊÉĞßWH‰Ù\ßHØYY
NÂˆBŸB›]H[Â™[˜İ[Ûˆ]

HÂˆ™]\›ˆH˜J
K˜Ø]Ú


HOˆÂˆ›İÈš[š]X[^™YHLKÛÛœÛÛK™\œ›ÜŠÉĞßWH[š]X[^˜][Ûˆ˜Z[Y
K›\İ\œ›ÜˆH›Y\ÜØYÙH¹b'yiâùc%¹i,z-)H‹Š
KÂˆJKÂŸB˜\Ş[˜È[˜İ[ÛˆØJ
HÂˆ™]\›ˆ]ØZ]

K]

NÂŸB˜\Ş[˜È[˜İ[ÛˆXJ
HÂˆ™]\›ˆ]ØZ]

K]

NÂŸB˜\Ş[˜È[˜İ[ÛˆJ
HÂˆ]ØZ]

Kİ
L
NÂŸB”›ÛZ\ÙKœ™\ÛÛ™J
K[Š

HOˆÂˆ]

K˜Ø]Ú


HOˆÂˆH[ÂˆJNÂŸJNÂ™^ÜÂˆØH\ÈÛXİ]˜]KˆXH\ÈÛ‘[˜X›KˆH\ÈÜ[”[™[ŸNÂ