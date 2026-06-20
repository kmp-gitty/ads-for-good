# Consent integration for storefronts

The Chapter pixel honors a `chapter_consent` cookie set on the storefront origin. Values: `opt_in` / `opt_out` / absent (treated as "unknown" — the server's per-client `consent_mode` policy decides what to do).

Clients drop their own cookie banner (Cookiebot, OneTrust, custom inline, etc.) and call `ChapterPixel.setConsent(...)` from the banner's accept/decline handlers. The pixel sets the cookie + tells the server.

## The API

```js
ChapterPixel.setConsent("opt_in");   // visitor accepted tracking
ChapterPixel.setConsent("opt_out");  // visitor declined tracking
```

What it does:

1. Sets `chapter_consent=<state>` cookie on the storefront origin (path `/`, SameSite=Lax, Secure on HTTPS, 1-year expiry)
2. POSTs to `/api/consent` so the server writes a consent event + propagates a cookie to the redirect/API origin (covers Tier 1 redirect cross-domain case)
3. Subsequent pixel events in the same session immediately use the new state (read from cookie on each `track()` call)

The pixel handles its own deferred queue, so this works even if called before `pixel.js` has loaded:

```js
(window.ChapterPixel = window.ChapterPixel || []).push(["setConsent", "opt_in"]);
```

## Integration recipes

### Cookiebot

```html
<script>
window.addEventListener("CookiebotOnAccept", function () {
  if (Cookiebot.consent.statistics) {
    ChapterPixel.setConsent("opt_in");
  } else {
    ChapterPixel.setConsent("opt_out");
  }
});
window.addEventListener("CookiebotOnDecline", function () {
  ChapterPixel.setConsent("opt_out");
});
</script>
```

### OneTrust

```html
<script>
OneTrust.OnConsentChanged(function (settings) {
  // C0002 = "Performance Cookies" category (adjust per your OT config)
  var analyticsConsent = OnetrustActiveGroups.indexOf("C0002") !== -1;
  ChapterPixel.setConsent(analyticsConsent ? "opt_in" : "opt_out");
});
</script>
```

### Custom inline banner

```html
<button id="accept-tracking">Accept</button>
<button id="decline-tracking">Decline</button>
<script>
document.getElementById("accept-tracking").addEventListener("click", function () {
  ChapterPixel.setConsent("opt_in");
  // ... your own dismiss-banner UI
});
document.getElementById("decline-tracking").addEventListener("click", function () {
  ChapterPixel.setConsent("opt_out");
});
</script>
```

## Known limitations (2026-06)

- **3P installs (EOS, projectagram) — cross-origin cookie propagation is best-effort.** When the pixel at `eosfabrics.com` calls `/api/consent` at `ads4good.com`, modern browsers' third-party cookie restrictions (Safari ITP, Brave, Firefox ETP) may block the `chapter_consent` response cookie from landing on `ads4good.com`. The server-side consent event still records, but the redirect handler at `ads4good.com/r/<key>/<slug>` may not see the right state on subsequent clicks. **Mitigation:** migrate these tenants to 1P installs (e.g. `chapter.eosfabrics.com`) — backlog item.

- **1P installs (adsforgood_prod, not_so_cavalier) — fully reliable.** Pixel + API + redirect are all on the same eTLD+1, so cookie sharing works without browser interference.

- **No standard Chapter consent UI.** By design — clients use their existing banner. Chapter just provides the integration API.

- **`consent_mode` is hardcoded `opt_out`** in event payloads today. This represents the per-client default policy when consent_status is unknown. Future: per-client config on `chapter_config.clients`.
