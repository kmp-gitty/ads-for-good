# Onboarding — Guardian Angel Cincy (Cincinnati daycare)

> **Status:** Plan locked, awaiting consultant answers before execution. Started June 30, 2026.
> **Consultant contact:** Goolsby Agency (specific contact TBD by Katoa)
> **Site:** https://www.guardianangelcincy.com
> **Business:** Guardian Angel Daycare, 3017 State Route 125, Bethel, OH 45106

## Decisions locked

| Field | Value | Source |
|---|---|---|
| `client_key` | `guardian_angel_cincy` | Katoa |
| `agency_key` | `goolsby_agency` (NEW — needs row created first) | Katoa |
| `storefront_domain` | `guardianangelcincy.com` | Confirmed |
| `display_tz` | `America/New_York` | Cincinnati = Eastern |
| `tier` | NULL | Design-partnership engagement; no tier assigned |
| `retention_days` | NULL | Same |
| `boundary_event_name` | `contact_form_submitted` | Katoa |
| `platform` | `custom` | Squarespace gets no dedicated adapter |
| `email_source_patterns` | `ARRAY[]::text[]` | No ESP today; avoid false-positive email channel classifications |
| Site builder | Squarespace 7.1 (React forms) | Inspected |
| Form selector | `form.react-form-contents` within `.form-wrapper` | Inspected — no `data-form-id` available in 7.1 |
| Tracking already on site | GTM + GA4 | Inspected |
| Cookie banner today | None | Inspected — they have tracking running without a banner (their existing compliance gap, not ours) |
| Privacy policy | Posted, Section 5 covers cookies + analytics | Read |

## Open questions for marketing consultant

> **Sent to consultant June 30, 2026.** Update when answers come back.

1. **DNS access for `guardianangelcincy.com`?** Who manages it (Squarespace itself if registered there, or external registrar). **⚠️ This is the most important answer** — it determines whether wrapped GBP/Facebook links carry identity across redirects. See "External link wrapping strategy" below for why.
2. **What Squarespace plan?** (Business+ needed for Code Injection; Personal blocks it unless we use GTM)
3. **GTM container access?** + Container ID
4. **Squarespace cookie banner add OK?** (15-min lift, value-add to client)
5. **Any third-party booking/intake system the contact form redirects to?** (Probably no — but confirm)

## Marketing channel context (from Katoa, July 2026)

Guardian Angel runs **organic only** on Google Maps + Facebook (no paid ads on either). High-traffic discovery paths:
- Google Maps / Google Business Profile listing
- Facebook Page + organic FB community posts
- Organic Google search ("daycare in Bethel OH")
- Word-of-mouth referrals

**No need for:** Facebook Conversions API, Meta Pixel reads, FB Graph API for ad accounts, GBP Ads API. All paid-optimization surfaces.

**Do need:** wrapped 1P links + UTM convention across the three high-traffic external touchpoints (see strategy section below).

## Privacy posture (locked, important)

**This is a daycare.** Sensitive data context.

**Will capture from the contact form:**
- Parent/Guardian first name (as a trait)
- Parent email → `email_sha256` (identity)
- Parent phone → `phone_sha256` (identity)
- Number of Children (non-PII prop, useful family-size signal)
- Preferred Start Date (non-PII prop, urgency signal)

**Will NOT capture:**
- Parent/Guardian last name (first name is enough for identity)
- Child first name
- Child last name
- Messages/Questions free text (could contain child info or PII)

**Operator-facing positioning:** "Chapter tracks the parent inquiry + attributes it to the channel that brought them, without touching child data. The form data the daycare team needs (child name, start date, full free-text questions) lands in their Gmail inbox as always — Chapter just captures the parent identity + family-size signal for attribution." This is a real differentiator vs Meta Pixel / GA4, which both slurp the entire form into their event payloads.

## Phase A — DB + repo provisioning (no consultant dependency)

### A1. Create `goolsby_agency` row

```sql
INSERT INTO chapter_config.agencies (agency_key, display_name, contact_email, notes)
VALUES ('goolsby_agency', 'Goolsby Agency', '<TBD>', 'First client: guardian_angel_cincy (Cincinnati daycare). Design-partnership engagement.');
```

Open question: contact_email TBD. NULL OK.

### A2. Create `guardian_angel_cincy` client row

```sql
INSERT INTO chapter_config.clients (
  client_key, agency_key, storefront_domain, boundary_event_name, display_tz,
  email_source_patterns, platform, tier, retention_days,
  redirect_host,  -- 1P scenario only — see note below
  notes
)
VALUES (
  'guardian_angel_cincy', 'goolsby_agency', 'guardianangelcincy.com',
  'contact_form_submitted', 'America/New_York',
  ARRAY[]::text[],
  'custom', NULL, NULL,
  'https://chapter.guardianangelcincy.com',  -- ONLY if DNS access granted; NULL otherwise
  'Cincinnati daycare, Squarespace 7.1 React form. Daycare → child PII NEVER captured (parent identity only).'
);
```

**`redirect_host` note:** set to `https://chapter.guardianangelcincy.com` when DNS access is confirmed (1P scenario, recommended). Leave NULL for 3P fallback — wrapped links then resolve via `ads4good.com` but without cookie persistence to the destination. Field can be added later via UPDATE if 1P migration happens in Phase 2.

### A3. Generate HMAC secret + insert into `client_secrets`

```bash
openssl rand -hex 32
```

```sql
INSERT INTO chapter_config.client_secrets (client_key, secret, key_version, notes)
VALUES ('guardian_angel_cincy', '<generated_hex>', 1, 'Initial onboarding secret');
```

### A4. Create per-client Postgres role + grants

```sql
CREATE ROLE client_guardian_angel_cincy NOLOGIN NOINHERIT NOBYPASSRLS;
GRANT client_guardian_angel_cincy TO chapter_app;

GRANT USAGE ON SCHEMA chapter_ingest, chapter_identity, chapter_journey TO client_guardian_angel_cincy;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA chapter_ingest, chapter_identity, chapter_journey TO client_guardian_angel_cincy;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA chapter_ingest, chapter_identity, chapter_journey TO client_guardian_angel_cincy;

ALTER DEFAULT PRIVILEGES IN SCHEMA chapter_ingest, chapter_identity, chapter_journey
  GRANT SELECT, INSERT, UPDATE ON TABLES TO client_guardian_angel_cincy;
```

### A5. Repo: add to `CLIENT_ROLE_MAP`

[src/app/lib/db/per-client.ts](../src/app/lib/db/per-client.ts):
```typescript
guardian_angel_cincy: "client_guardian_angel_cincy",
```

### A6. Repo: add to `CHAPTER_ALLOWED_ORIGINS`

[src/app/lib/auth/cors.ts](../src/app/lib/auth/cors.ts):
```typescript
"https://guardianangelcincy.com",
"https://www.guardianangelcincy.com",
"https://chapter.guardianangelcincy.com",  // include even on 3P fallback — harmless extra origin
```

Including the `chapter.` subdomain unconditionally is harmless even if 1P DNS isn't set up immediately — it just won't resolve and no requests will come from it. Saves a future change when DNS access is granted later.

### A6.5. Provision redirect rules for GBP + Facebook wraps

```sql
-- GBP "Website" link wrap
INSERT INTO chapter_config.redirect_rules (
  client_key, slug, rule_priority,
  condition_jsonb, destination_template, enabled, description
)
VALUES (
  'guardian_angel_cincy', 'gbp', 10,
  '{}'::jsonb,
  '{q:to}?utm_source={q:utm_source}&utm_medium={q:utm_medium}&utm_campaign={q:utm_campaign}',
  true,
  'GBP "Website" field wrap. Catch-all passthrough.'
);

-- Facebook Page "Website" link wrap
INSERT INTO chapter_config.redirect_rules (
  client_key, slug, rule_priority,
  condition_jsonb, destination_template, enabled, description
)
VALUES (
  'guardian_angel_cincy', 'facebook', 10,
  '{}'::jsonb,
  '{q:to}?utm_source={q:utm_source}&utm_medium={q:utm_medium}&utm_campaign={q:utm_campaign}',
  true,
  'Facebook Page "Website" field wrap. Catch-all passthrough.'
);

-- Facebook organic post wrap (utm_content varies per post)
INSERT INTO chapter_config.redirect_rules (
  client_key, slug, rule_priority,
  condition_jsonb, destination_template, enabled, description
)
VALUES (
  'guardian_angel_cincy', 'fb-post', 10,
  '{}'::jsonb,
  '{q:to}?utm_source={q:utm_source}&utm_medium={q:utm_medium}&utm_campaign={q:utm_campaign}&utm_content={q:utm_content}',
  true,
  'Facebook organic post wrap. Per-post utm_content varies. Catch-all passthrough.'
);
```

### A7. Repo: add to dashboard `CLIENTS` list

[src/app/chapter/_components/mockdata.ts](../src/app/chapter/_components/mockdata.ts):
```typescript
{ id: "guardian_angel_cincy", name: "Guardian Angel Daycare", tier: "Starter", color: "<pick fifth color>" },
```

### A8. Commit + push

Single commit: `onboard guardian_angel_cincy under goolsby_agency`. Triggers Vercel deploy.

## Phase B — Pixel snippet (locked, ships with Phase A)

### Base pixel tag

```html
<script async src="https://ads4good.com/api/chapter/pixel.js"
        data-client-key="guardian_angel_cincy"></script>
```

### Custom event listener (parent-identity-only, child-name-skip)

```html
<script>
(function() {
  if (window.__chapter_form_bound) return;
  window.__chapter_form_bound = true;

  function tryBind() {
    document.addEventListener('submit', function(e) {
      var form = e.target;
      if (!form.matches || !form.matches('form.react-form-contents')) return;
      if (!form.closest('.form-wrapper')) return;

      // Mirror Squarespace's own validation — only fire on validated submits
      var emailEl = form.querySelector('input[type="email"]');
      var phoneEl = form.querySelector('input[autocomplete="tel-national"]');
      var email = emailEl && emailEl.value && emailEl.value.trim();
      var phone = phoneEl && phoneEl.value && phoneEl.value.trim();
      if (!email || email.indexOf('@') < 0) return;
      if (!phone) return;

      // Parent identity — FIRST fieldset.name (Parent / Guardian Name).
      // Child name fieldset (2nd) is NEVER read.
      var parentFieldset = form.querySelector('fieldset.name');
      var firstNameEl = parentFieldset && parentFieldset.querySelector('input[name="fname"]');
      var parentFirst = firstNameEl && firstNameEl.value && firstNameEl.value.trim();

      // Non-PII props
      var numKidsEl = form.querySelector('select[aria-label="Number of Children"]');
      var numKids = numKidsEl && numKidsEl.value;
      var startDateEl = form.querySelector('input[type="date"]');
      var startDate = startDateEl && startDateEl.value;

      if (window.ChapterPixel && window.ChapterPixel.identify) {
        ChapterPixel.identify({
          email: email,
          phone: phone,
          traits: { first_name: parentFirst || undefined }
        });
      }
      if (window.ChapterPixel && window.ChapterPixel.track) {
        ChapterPixel.track('contact_form_submitted', {
          number_of_children: numKids,
          preferred_start_date: startDate || null,
          page_url: window.location.href,
        });
      }
    }, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryBind);
  } else {
    tryBind();
  }
})();
</script>
```

Idempotent via `__chapter_form_bound` flag (same pattern as EOS's June 10 dedup fix).

## External link wrapping strategy (organic GBP + Facebook)

### The architecture distinction

Tier 1 wrapped links live at `/r/<client_key>/<slug>` on Vercel. The **host serving the redirect** determines whether the identity cookie persists to the destination:

| Host serving redirect | Cookie domain set on 302 | Pixel on `guardianangelcincy.com` reads it? |
|---|---|---|
| `ads4good.com` (3P fallback) | `.ads4good.com` | ❌ different eTLD+1 |
| `chapter.guardianangelcincy.com` (1P) | `.guardianangelcincy.com` | ✅ same eTLD+1 |

Even in the 3P fallback we still get:
- ✅ Server-side click log (`X clicks via GBP this month, classified as google_local`)
- ✅ UTMs carry through the 302 → channel classified correctly at landing
- ❌ No identity-cookie-at-click-time persistence to destination

### Why 1P DNS is essential for a daycare specifically

**Daycare consideration windows are 3-6 weeks.** Parents discover the daycare via GBP/Facebook, browse the website, then return weeks later to submit the contact form. Without cookie persistence, that late-returning visitor looks like a fresh Direct visit → first-touch attribution credit is lost → GBP/Facebook channels appear to under-deliver.

**The DNS question moves from "optional based on answer" to "essential for the wrapping strategy to work as designed."** If DNS access is genuinely impossible, we ship 3P fallback as a Phase 1 stopgap, log click counts as the primary signal, and plan a 1P migration as Phase 2.

### The three high-traffic touchpoints to wrap

1. **GBP "Website" field** (Google Business Profile dashboard → Edit profile → Contact → Website):
   ```
   https://chapter.guardianangelcincy.com/r/guardian_angel_cincy/gbp?to=https://guardianangelcincy.com&utm_source=google&utm_medium=local&utm_campaign=gbp
   ```

2. **Facebook Page "Website" field** (FB Page settings → About → Website):
   ```
   https://chapter.guardianangelcincy.com/r/guardian_angel_cincy/facebook?to=https://guardianangelcincy.com&utm_source=facebook&utm_medium=social&utm_campaign=facebook_page
   ```

3. **FB organic post links** (consultant pastes wrapped form when posting; use a generic `fb-post` slug + per-post `utm_content`):
   ```
   https://chapter.guardianangelcincy.com/r/guardian_angel_cincy/fb-post?to=https://guardianangelcincy.com&utm_source=facebook&utm_medium=social&utm_campaign=facebook_organic&utm_content=2026-07-summer-program
   ```

### Two redirect rules to provision in `chapter_config.redirect_rules`

When DB provisioning happens, add to the same migration as Phase A:
- `(client_key='guardian_angel_cincy', slug='gbp', destination_template='{q:to}?utm_source={q:utm_source}&utm_medium={q:utm_medium}&utm_campaign={q:utm_campaign}')` — catch-all priority 10
- `(client_key='guardian_angel_cincy', slug='facebook', destination_template='same as above')` — catch-all priority 10
- `(client_key='guardian_angel_cincy', slug='fb-post', destination_template='same, plus utm_content={q:utm_content}')` — catch-all priority 10

All three are simple passthrough rules — no conditions, no A/B, no audience targeting. Just log the click + redirect.

### What we cannot see (be honest about this)

- **GBP profile views** (showing up in search results without clicking) — invisible. Only aggregate count via GBP API integration (Phase 2 build).
- **GBP "Directions" clicks** — invisible. Aggregate only via API.
- **GBP "Call" clicks (mobile tap-to-call)** — invisible. Aggregate only via API. **For daycare this is a meaningful gap** — many parents call before they fill forms. Worth surfacing to consultant.
- **FB Page views / likes / post engagement** — invisible. Aggregate only via Graph API.

These are tracked by Google + Meta but not exposed per-visitor to anyone. The Phase 2 API integrations would give us aggregate counts that match what GBP/FB show the operator natively — useful for a richer dashboard tile, not for attribution math.

## Phase C — Install doc for consultant (skeleton)

Will be tailored to consultant answers. Outline:

1. **Access needed before starting** — Squarespace site Editor, GTM container Editor, DNS for the domain
2. **Privacy: what this captures + what it doesn't** — parent only, never child
3. **Step 1: DNS** — CNAME setup (1P is strongly preferred; 3P is a stopgap if DNS truly unavailable)
4. **Step 2: Pixel install** — via GTM (preferred) OR Squarespace Code Injection (fallback)
5. **Step 3: Cookie banner** — Squarespace native config + 3-line integration (optional, recommended)
6. **Step 4: Wrap external links** — GBP "Website", FB Page "Website", FB organic post links. Includes reference card with the exact URL formats per channel.
7. **Step 5: Verification** — submit test inquiry, check `/chapter/guardian_angel_cincy/raw`, confirm event landed; click each wrapped link, verify it appears in dashboard
8. **Weekly review cadence** — first walkthrough with consultant + client

## Decisions sensitive to consultant answers

| Answer scenario | Plan impact |
|---|---|
| Squarespace = Personal plan + GTM access granted | Workable. GTM-only install. |
| Squarespace = Personal + GTM denied | Blocked. Personal can't inject pixels; no GTM = no path. Must upgrade plan OR get GTM. |
| Squarespace = Business+ | Best case. GTM preferred, Code Injection fallback. |
| GTM access granted | Use GTM. No Code Injection needed. |
| GTM denied + Business+ | Fall back to Code Injection. |
| DNS access granted | Add `chapter.guardianangelcincy.com` CNAME. 1P install + 1P redirect host. Update A6 CORS to include the 1P origin. Update A2 to set `redirect_host = 'https://chapter.guardianangelcincy.com'`. Wrapped GBP/FB links use this subdomain → cookie persistence works. **This is the strongly-preferred path.** |
| DNS denied / unavailable | Ship 3P from `ads4good.com`. Wrapped links use `ads4good.com/r/guardian_angel_cincy/...` — server-side click logs still work, UTMs still pass through, but identity cookie does NOT persist to destination. **Acceptable Phase 1 stopgap** for short-consideration paths but suboptimal for daycare (3-6 week consideration windows mean late returners look like Direct). **Plan 1P migration as Phase 2** when DNS access surfaces. |
| Cookie banner add accepted | Doc Section 5 = real instructions + 3-line `ChapterPixel.setConsent()` |
| Cookie banner add declined | Ship in `opt_in` default (US convention). Their existing privacy policy covers it. |
| Cross-domain booking system exists | Phase 2 Tier 1 redirect work needed. Doesn't block Day 1. |
| Cross-domain booking system doesn't exist | Locked. Nothing else needed. |

## Notes for next session pickup

When the consultant comes back with answers:
1. Update the "Decisions locked" table at top with the actual answers
2. Cross out / strike through "Open questions for marketing consultant" section
3. Pick one branch in "Decisions sensitive to consultant answers" — adapt plan accordingly
4. Execute Phase A (provisioning)
5. Generate Phase C install doc from the picked branch
6. Send to consultant
