# Tier 1 First-Party Redirect — Operator Guide

The `/r/<client_key>/<slug>` endpoint is Chapter's intelligent routing layer. Every click:

1. Drops a `chapter_journey` + `chapter_identity` cookie (so the click stitches to any pixel-tracked downstream events)
2. Evaluates priority-ordered rules against the visitor's context (identity, cart, geo, device, A/B, time, query params)
3. Picks the matching rule's destination (or falls back to `?to=` query param)
4. Logs a `redirect_click` event into `chapter_ingest.pixel_events` so the click flows into attribution
5. 302s the visitor to the resolved destination

**Latency target: <50ms.** Achieved via 5-min in-process caches on rules / AB experiments / segments, parallel DB lookups, and fire-and-forget click logging.

---

## URL shape

```
https://ads4good.com/r/<client_key>/<slug>?<query>
```

- `client_key` — Chapter client identifier (e.g. `eos_fabrics`)
- `slug` — campaign/destination key (e.g. `booknow`, `summer_sale`, `cart_recover`)
- `query` — passthrough UTM params, optional `?to=<encoded-url>` fallback

When we procure a dedicated redirect domain (e.g. `chptr.link`), the path becomes shorter (`chptr.link/<client_key>/<slug>`) and the cookie is set on `.chptr.link` instead of `.ads4good.com`. No other code changes.

---

## Rule shape

Rules live in `chapter_config.redirect_rules`. Each rule has:

| Column | What |
|---|---|
| `client_key` | scopes the rule |
| `slug` | path segment |
| `rule_priority` | int — lower wins; first match short-circuits |
| `condition_jsonb` | object of typed conditions (AND-ed) |
| `destination_template` | URL with `{param}` interpolation |
| `enabled` | bool |
| `description` | operator-readable notes |

**Catch-all default rule**: condition_jsonb = `{}`, priority = high (e.g. 1000). Always matches.

---

## Condition types

All conditions in a rule's object must match (AND semantics).

### Visitor segments
- `is_new_visitor`: bool — visitor with no `canonical_v1` history
- `is_returning_visitor`: bool — has ≥1 canonical chapter
- `has_converted_ever`: bool
- `has_converted_in_days`: int — days threshold
- `audience_tag`: string OR string[] — cohort membership (from `chapter_config.connections_cohort_members`)

### Cart state (Shopify clients)
- `has_open_cart`: bool — based on recent `add_to_cart`/`view_cart` pixel events
- `cart_older_than_hours`: number

### Time
- `day_of_week`: int 0-6 OR int[] (0=Sunday UTC)
- `hour_of_day`: `{ from: 0-23, to: 0-23 }` (UTC; supports cross-midnight)
- `date_range`: `{ from?: ISO, to?: ISO }`

### Query params
- `query_param`: `{ "utm_source": "mailchimp" }` — every listed key must match

### Referrer
- `referrer_matches`: regex string

### Geo (from Vercel headers)
- `country_in`: string OR string[] (ISO 3166-1 alpha-2)
- `region_in`: string OR string[]

### Device (UA classification)
- `device_type`: "mobile" | "tablet" | "desktop" | "bot"
- `os`: "ios" | "android" | "macos" | "windows" | "linux"

### A/B
- `ab_bucket`: `{ "experiment_id": "X", "bucket": "A" }` — deterministic by hash(identity + seed)

---

## Destination template interpolation

Supports `{param}` placeholders, URL-encoded before substitution:

| Var | What |
|---|---|
| `{identity_key}` | visitor's anonymous_id or canonical key |
| `{client_key}` | for shared templates |
| `{country}` / `{region}` / `{city}` | geo |
| `{device_type}` / `{os}` | UA classification |
| `{q:utm_source}` | pull `utm_source` from inbound query string |

---

## Example rule sets

### Single client, multiple slugs

**Barbershop / Square booking — campaign attribution**

```sql
INSERT INTO chapter_config.redirect_rules
  (client_key, slug, rule_priority, condition_jsonb, destination_template, description)
VALUES
  ('barber_shop', 'booknow', 1000, '{}'::jsonb,
   'https://squareup.com/appointments/book/<merchant-id>/<location-id>',
   'Default — route every booking-link click to Square booking page');
```

**EOS Fabrics — returning customer with open cart gets cart page**

```sql
INSERT INTO chapter_config.redirect_rules (client_key, slug, rule_priority, condition_jsonb, destination_template, description)
VALUES
  ('eos_fabrics', 'shopnow', 50,
   '{"is_returning_visitor": true, "has_open_cart": true}'::jsonb,
   'https://eosfabrics.com/cart?utm_source={q:utm_source}',
   'Returning customer with open cart → cart page'),
  ('eos_fabrics', 'shopnow', 100, '{}'::jsonb,
   'https://eosfabrics.com/?utm_source={q:utm_source}&utm_medium={q:utm_medium}&utm_campaign={q:utm_campaign}',
   'Default — homepage with passthrough UTM');
```

**Mobile device gets Shop Pay deep link**

```sql
INSERT INTO chapter_config.redirect_rules (client_key, slug, rule_priority, condition_jsonb, destination_template, description)
VALUES
  ('eos_fabrics', 'shopnow', 30,
   '{"device_type": "mobile", "os": "ios"}'::jsonb,
   'shop://product/<sku>',
   'iOS mobile → Shop Pay deep link');
```

**A/B test landing pages without resending email**

```sql
INSERT INTO chapter_config.redirect_ab_experiments
  (client_key, experiment_id, seed, buckets_jsonb, description)
VALUES
  ('eos_fabrics', 'hero_aug26', 'eos_hero_2026_08_test',
   '{"A": 50, "B": 50}'::jsonb, 'Hero image variant test, Aug 2026');

INSERT INTO chapter_config.redirect_rules (client_key, slug, rule_priority, condition_jsonb, destination_template, description)
VALUES
  ('eos_fabrics', 'summer', 10, '{"ab_bucket": {"experiment_id": "hero_aug26", "bucket": "A"}}'::jsonb,
   'https://eosfabrics.com/summer?v=a', 'Variant A landing'),
  ('eos_fabrics', 'summer', 11, '{"ab_bucket": {"experiment_id": "hero_aug26", "bucket": "B"}}'::jsonb,
   'https://eosfabrics.com/summer?v=b', 'Variant B landing'),
  ('eos_fabrics', 'summer', 100, '{}'::jsonb,
   'https://eosfabrics.com/summer', 'Default fallback');
```

---

## ESP wrap patterns

Most email service providers wrap every link in the email body with their own click-tracker. Chapter's Tier 1 layer is compatible — the flow becomes:

```
recipient clicks email link
  → ESP click-tracker (250ms)
  → 302 to Chapter /r/<client>/<slug>?utm_source=...
  → Chapter records click + evaluates rules (50ms)
  → 302 to destination
  → visitor lands
```

Both ESP and Chapter get their signal. ~150ms extra latency vs no-ESP-wrap, negligible.

### Mailchimp

Paste the Chapter URL directly into the campaign body. Mailchimp wraps it automatically. Pass UTM via Chapter URL:

```
https://ads4good.com/r/eos_fabrics/shopnow?utm_source=mailchimp&utm_medium=email&utm_campaign={{ campaign_id }}
```

### Klaviyo

Same pattern. Klaviyo's `{% campaign_name %}` variable is useful:

```
https://ads4good.com/r/eos_fabrics/shopnow?utm_source=klaviyo&utm_medium=email&utm_campaign={% campaign_name %}
```

### Shopify Email

Paste Chapter URL. Shopify Email auto-wraps with click tracking.

### Meta / Google Ads

Use the Chapter URL as the destination URL. Set up tracking template:

```
{lpurl}?utm_source=meta&utm_medium=cpc&utm_campaign={campaign.name}&fbclid={fbclid}
```

Where `{lpurl}` resolves to the Chapter URL.

---

## Cross-domain identity stitching

The redirect domain (`ads4good.com`) and the destination storefront (e.g. `eosfabrics.com`) live on different apexes, so their first-party cookies don't see each other. Two layered mechanisms close that gap:

### Solution 1 — `?chid` handoff to destination (same-device coverage)

The redirect auto-appends `?chid={identity_key}&jid={journey_id}` to every resolved destination URL (unless the rule template already set `chid`). The destination's Chapter pixel reads these on first landing and calls `/api/identify` with `previous_identity_key = chid`, which inserts an alias edge `R ↔ E` in `identity_aliases`. The canon trigger then folds both into the same canonical.

After the handoff fires, the pixel **strips `chid` + `jid` from the URL via `history.replaceState`** so they don't ride along into screenshots, social shares, or third-party referrer headers.

Covers every same-device case, including future un-redirected returns from any source — once the canonical contains R, every later event on E (any identifier transitively linked to E) stitches back to R.

Doesn't help when:
- The destination has no Chapter pixel (cross-domain to e.g. Square's hosted booking page)
- The visitor is on a different device than the click

### Solution 2 — server-side identity stitch from URL hint (cross-device coverage)

For the cases solution 1 can't cover, the redirect supports three optional URL hint params. All are stripped from the forwarded URL + click log before anything is written downstream.

| Param | Flavor | What it carries | When to use |
|---|---|---|---|
| `?rh=<64-hex>` | #1 free | pre-hashed `email_sha256` | ESP can pre-hash at send time |
| `?re=<plaintext>` | #2 universal | raw email — hashed server-side, never logged | any ESP with a plaintext-email merge tag |
| `?rid=<opaque>` | #3 privacy-strongest | opaque ESP per-recipient ID (Mailchimp UNIQID, Klaviyo person.id) | ESP whose engagement events are synced into `chapter_config.email_engagement_events.recipient_token` |

Precedence (most-private wins): `rh > rid > re`. Multiple present → the strongest one is used, the others are dropped.

On click, the redirect resolves the hint to `email_sha256:X` and inserts an alias edge `R ↔ email_sha256:X` into `identity_aliases` (fire-and-forget). Future appearances of `email_sha256:X` on any device — purchase webhook, identify event, Square Customers API enrichment — fold into the same canonical, completing the cross-device stitch.

#### Wiring flavor #3 per ESP

1. Extend the ESP sync script to populate `chapter_config.email_engagement_events.recipient_token` alongside `email_sha256`.
2. Operator inserts `?rid=*|UNIQID|*` (Mailchimp) or equivalent merge tag into the redirect URL inside the campaign body.
3. No additional code change — `resolveRecipientToken(client_key, token)` already joins by `(client_key, recipient_token)`.

As of v1 only Mailchimp's sync needs extending (backlog item). Until then `?rid` resolves to null and silently no-ops — no error path, just no stitch.

#### Privacy contract

- Plaintext email (`?re=`) is hashed in-process and never logged. The `re` param is stripped from `props.full_query`, from the forwarded URL, and from any pixel_events row before they leave this server.
- Opaque token (`?rid=`) is meaningless without our backend join — equivalent to a session key from the visitor's perspective.
- Pre-hashed (`?rh=`) is already an irreversible identifier.

All three are gated by the consent gate (below). On opt-out: no hint is extracted, no alias edge is inserted, no cookies are set.

---

## Consent gate

The redirect endpoint reads a `chapter_consent` cookie scoped to the redirect apex (e.g. `.ads4good.com`) and applies the same opt-out contract that `/api/chapter/collect` honors. **Always-on; no per-client toggle.**

| Cookie value | Click logged? | Cookies issued? | Visitor still redirected? |
|---|---|---|---|
| `opt_out` | no | no | **yes** — routing is the service they asked for |
| `opt_in` | yes | yes | yes |
| absent | yes (US default) | yes | yes |

What "blocked" means in code:
- Skip the `logRedirectClick` insert into `pixel_events`
- Skip `applyIdentityCookies` — no new `chapter_identity` / `chapter_journey` issued
- Existing cookies are **not** cleared (that's the consent banner's job on whichever property the visitor expressed the opt-out)
- Rule evaluation + segment lookups still run — reading existing identity context to route a visitor is not "collection"

### Cross-domain caveat

The consent cookie lives on the redirect apex, not the destination storefront. A visitor who opts out on `eosfabrics.com` but never on `ads4good.com` will be tracked by the redirect until/unless a `/api/consent-sync` endpoint propagates the choice. That sync is a future enhancement; for v1 the cleanest path is to install the consent banner on the redirect apex too (or use a shared subdomain like `go.eosfabrics.com` so cookies cross the apex).

### Per-client default

The `applyConsentPolicy(state, defaultWhenUnknown)` helper takes a default for the "unknown" state. v1 hardcodes `"opt_in"` (US default — collect unless explicit opt-out). EU-strict clients will get a per-client config knob to flip the default to `"opt_out"` when first EU client onboards.

---

## Cache invalidation

When operators edit a rule via the admin UI, the server action calls `clearRulesCache(client_key, slug)`. The 5-min in-process cache is invalidated on the lambda that handled the save. **Other lambdas (cold or warm) continue serving stale rules for up to 5 minutes.** This is acceptable for marketing rule changes (they propagate within minutes, not seconds).

For URGENT rollback, manually call `clearRulesCache()` via a dev endpoint or trigger a deploy (each deploy gets fresh lambdas).

---

## Admin UI

`/internal/redirect-rules` — gated by `CHAPTER_DASH_TOKEN` cookie like the rest of the agency-internal surfaces. List view → per-client rule list → create/edit forms.

The condition_jsonb field is a raw JSON textarea for v1. A structured editor is on the backlog ("Replace JSON textareas in admin form with structured editors").
