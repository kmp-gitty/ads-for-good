# Chapter client-side theme snippets — canonical source of truth

> Until this file existed, every client's storefront theme was a hand-edited
> fork with no source of truth. This is the authoritative version of every
> client-side snippet. **Copy from here; do not re-author per client.** When a
> snippet changes, change it here first, then re-paste into the affected themes.
>
> Placeholders: replace `CLIENT_KEY` with the client's `chapter_config.clients.client_key`.

## Design principle — keep the theme thin

The theme should carry as little logic as possible, because anything in a theme
is a per-client fork we can't update centrally. `pixel.js` is served
`Cache-Control: no-store`, so any logic that lives IN it updates every client on
their next page load with zero theme edits. **Direction of travel: fold these
handlers into `pixel.js` (platform-aware selectors, with per-client overrides in
a `chapter_config.clients.theme_selectors_jsonb` column) so the theme shrinks to
just the base tag + the CMP consent hook.** Until that lands, this doc is the
source of truth.

## The queue contract (why every snippet uses `.push([...])`)

`pixel.js` exposes `window.ChapterPixel`. Before it loads, any snippet that
needs it should use the **stub-queue** form:

```js
(window.ChapterPixel = window.ChapterPixel || []).push(["track", "EVENT", { ...props }]);
```

- Before `pixel.js` runs, `window.ChapterPixel` is an array and `.push` appends
  a command. On init `pixel.js` drains that array (`for (…) api.push(queue[i])`),
  so nothing queued before load is lost.
- After `pixel.js` runs, `window.ChapterPixel` is the real API object whose
  `.push(["track", …])` dispatches immediately.
- Either way it never throws, and every command routes through the same
  consent-gated `send()` path.

**Do NOT call `window.ChapterPixel?.track(...)` directly.** Optional chaining
guards the object, not the method: before load `ChapterPixel` is the array stub,
`.track` is `undefined`, and `(ChapterPixel?.track)(...)` calls `undefined(...)`
→ `TypeError` on an early click. `?.track?.()` would stop the throw but silently
drop the event. The queue form is strictly correct — it neither throws nor drops.

Supported queue commands: `["track", name, props]`, `["identify", { identity_key }]`,
`["setConsent", "opt_in"|"opt_out"]`.

---

## 1. Base tag — every page (theme.liquid `<head>`)

```html
<script async src="https://ads4good.com/api/chapter/pixel.js" data-client-key="CLIENT_KEY"></script>
```

`async` or `defer` are both fine — the queue contract makes load order
irrelevant. Fires `page_view`, `scroll_depth`, `hover_intent`, click/engagement
events, and (Shopify) captures `_shopify_y` automatically. Consent is enforced
inside `pixel.js`; the theme never needs to gate the base tag.

## 2. CMP / consent hook (only if the storefront has a consent banner)

A Consent Management Platform (OneTrust / Cookiebot / custom) tells Chapter the
visitor's choice by calling:

```js
window.ChapterPixel && window.ChapterPixel.setConsent
  ? ChapterPixel.setConsent("opt_in")   // or "opt_out"
  : (window.ChapterPixel = window.ChapterPixel || []).push(["setConsent", "opt_in"]);
```

See `docs/consent-integration.md` for per-CMP wiring. No banner ⇒ omit this;
Chapter still honors GPC automatically for the visitors who send it.

## 3. Add to cart (Shopify)

```html
<script>
  document.addEventListener("click", function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    // Per-theme: tune this selector to the theme's add-to-cart control.
    var btn = t.closest('form[action$="/cart/add"] [type="submit"], [name="add"], [data-add-to-cart]');
    if (!btn) return;
    (window.ChapterPixel = window.ChapterPixel || []).push(["track", "add_to_cart", {
      page_url: window.location.href
    }]);
  }, true);
</script>
```

## 4. Cart view (Shopify)

```html
<script>
  if (/(^|\/)cart(\/|$)/.test(window.location.pathname)) {
    (window.ChapterPixel = window.ChapterPixel || []).push(["track", "view_cart", {
      page_url: window.location.href
    }]);
  }
</script>
```

## 5. Login / account identify (Shopify) — Liquid, no DOM scrape

**Replaces** the old `document.body.innerText` regex-scrape + 1s×10 poll. Shopify
renders the logged-in customer's email directly via Liquid, so we read it
authoritatively, hash it client-side (raw email never leaves the browser), and
enqueue an identify. Survives theme redesigns; no scraping, no polling.

Place in the account template (`customers/account.liquid`) or in `theme.liquid`
gated on `{% if customer %}`:

```liquid
{% if customer %}
<script>
  (function () {
    var email = {{ customer.email | json }};
    if (!email || !window.crypto || !crypto.subtle) return;
    var norm = String(email).trim().toLowerCase();
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(norm)).then(function (buf) {
      var hex = Array.prototype.map.call(new Uint8Array(buf), function (b) {
        return ("0" + b.toString(16)).slice(-2);
      }).join("");
      (window.ChapterPixel = window.ChapterPixel || []).push(["identify", {
        identity_key: "email_sha256:" + hex
      }]);
    });
  })();
</script>
{% endif %}
```

`{{ customer.email | json }}` emits a safely-quoted JS string. The hash is
`sha256(lower(trim(email)))` → `email_sha256:<hex>`, matching the server's
identity convention exactly.

## 6. Newsletter / contact form identify (generic)

Same pattern as login, but sourced from a submitted form field instead of Liquid.
Tune the form + input selectors per theme.

```html
<script>
  document.addEventListener("submit", function (e) {
    var form = e.target;
    if (!form || !form.matches || !form.matches('form[action*="/contact"], form#newsletter-footer')) return;
    var el = form.querySelector('input[type="email"]');
    var email = el && el.value && el.value.trim();
    if (!email || email.indexOf("@") < 0 || !window.crypto || !crypto.subtle) return;
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(email.toLowerCase())).then(function (buf) {
      var hex = Array.prototype.map.call(new Uint8Array(buf), function (b) {
        return ("0" + b.toString(16)).slice(-2);
      }).join("");
      (window.ChapterPixel = window.ChapterPixel || []).push(["identify", {
        identity_key: "email_sha256:" + hex
      }]);
    });
  }, true);
</script>
```

---

## Known follow-ups (repo-side, not theme-side)

- **`api.identify` / `/api/identify` honor GPC but not an explicit `opt_out`
  cookie.** `send()` (track) is fully consent-gated, but identify is not: a
  logged-in visitor who explicitly opted out still gets an identity edge on
  login. Fix centrally — gate `api.identify` on `chapterCollectionBlocked()`
  client-side AND drop the write in `/api/identify` when the request carries
  `chapter_consent=opt_out` (mirror the GPC skip already there). Then snippet #5
  is automatically consent-safe and no theme needs to know about consent.
- **`chapterPostConsent` still hardcodes `consent_mode: "opt_out"`** in its
  `/api/consent` POST (same class as the pixel `send()` hardcode already removed).
  Low impact (setConsent carries an explicit status, so `consent_mode` is moot
  there) but should be dropped for consistency once server-authoritative.
- **Fold #3–#6 into `pixel.js`** with per-client selector overrides, so the theme
  is eventually just #1 (+ #2 where a banner exists).
