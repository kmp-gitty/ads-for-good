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

1. **What Squarespace plan?** (Business+ needed for Code Injection; Personal blocks it unless we use GTM)
2. **GTM container access?** + Container ID
3. **DNS access for `guardianangelcincy.com`?** Who manages it (Squarespace itself if registered there, or external registrar)
4. **Squarespace cookie banner add OK?** (15-min lift, value-add to client)
5. **Any third-party booking/intake system the contact form redirects to?** (Probably no — but confirm)

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
  email_source_patterns, platform, tier, retention_days, notes
)
VALUES (
  'guardian_angel_cincy', 'goolsby_agency', 'guardianangelcincy.com',
  'contact_form_submitted', 'America/New_York',
  ARRAY[]::text[],
  'custom', NULL, NULL,
  'Cincinnati daycare, Squarespace 7.1 React form. Daycare → child PII NEVER captured (parent identity only).'
);
```

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
// "https://chapter.guardianangelcincy.com", // add if 1P DNS access confirmed
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

## Phase C — Install doc for consultant (skeleton)

Will be tailored to consultant answers. Outline:

1. **Access needed before starting** — Squarespace site Editor, GTM container Editor, DNS for the domain
2. **Privacy: what this captures + what it doesn't** — parent only, never child
3. **Step 1: DNS** — CNAME setup (1P only; skip if 3P)
4. **Step 2: Pixel install** — via GTM (preferred) OR Squarespace Code Injection (fallback)
5. **Step 3: Cookie banner** — Squarespace native config + 3-line integration (optional, recommended)
6. **Step 4: Verification** — submit test inquiry, check `/chapter/guardian_angel_cincy/raw`, confirm event landed
7. **Weekly review cadence** — first walkthrough with consultant + client

## Decisions sensitive to consultant answers

| Answer scenario | Plan impact |
|---|---|
| Squarespace = Personal plan + GTM access granted | Workable. GTM-only install. |
| Squarespace = Personal + GTM denied | Blocked. Personal can't inject pixels; no GTM = no path. Must upgrade plan OR get GTM. |
| Squarespace = Business+ | Best case. GTM preferred, Code Injection fallback. |
| GTM access granted | Use GTM. No Code Injection needed. |
| GTM denied + Business+ | Fall back to Code Injection. |
| DNS access granted | Add `chapter.guardianangelcincy.com` CNAME. 1P install. Update A6 CORS. |
| DNS denied / unavailable | Ship 3P from `ads4good.com`. Same as EOS/Projectagram. Defer 1P to later. |
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
