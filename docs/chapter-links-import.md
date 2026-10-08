# Chapter Links — bulk import template

Paste-ready template: [`chapter-links-import-template.csv`](chapter-links-import-template.csv)
Tool: **Import** tab at `/internal/chapter-links/<client>?tab=import`

Use **Import** when every link is bespoke — a rail of 50 partner logos, a batch of
affiliate articles. Use **Matrix** when the links are a product of each other —
one advertiser across five papers, or four banner sizes in one rail.

---

## Columns

Every column is optional in the file. What matters is that each field is supplied
**somehow** — as a column, as a constant set once for the whole import, or set on a
selection of rows in the tool. Columns are for what *varies*.

| column | goes to | notes |
|---|---|---|
| `property` | the link host | `Montco` → `go.montco.today`, matched against the client's hosts. Usually a **constant** when importing one paper at a time. |
| `slug` | the URL path | `display`, `article`, `newsletter`… Usually a **constant** per import. Determines whether `destination` is required. |
| `destination` | `?to=` | Required for pass-through rules (all of ACJ's). Encoded automatically. |
| `partner` | dimension | **Must match exactly across papers** — `firstrust_bank` and `firstrust` report as two advertisers, forever, silently. |
| `promo` | dimension | The relationship tier or placement class: `founding_partner_logo`, `affiliate_article_cta`. |
| `loc` | dimension | **Position.** `right_rail`, `newsletter_top`, `end_of_article`. See *loc granularity* below. |
| `size` | dimension | `300x250`. Leave blank for text CTAs. |
| `creative` | dimension | The asset name. **Never put this in the link id** — see below. |
| `article` | dimension | Which article an in-article CTA sits in. ACJ only. |
| `utm_source` `utm_medium` `utm_campaign` | `utm` column | **Chapter's own** campaign tagging, a different column from dimensions. Not the partner's UTMs — those live inside `destination` and ride through untouched. |
| `link` | *cross-check only* | Optional. If present, map it as the cross-check: it is **compared** to the derived id and flagged on mismatch, **never used**. |

---

## The link id is derived, never pasted

Set a **pattern** in the tool. The id is built from it and normalised to
`[a-z0-9_-]`. Defaults:

```
display, newsletter   {property}-{partner}-{promo}-{loc}
article               {property}-{partner}-{promo}-{article}-{loc}
```

A mixed import needs the rows split by pattern — import one placement's worth at a
time, or use Matrix, where each placement block carries its own.

**The rule: the id is built from what defines WHICH SLOT this is — property, partner,
promo, loc, article. Never from what OCCUPIES the slot — creative, size, destination.**

Creative is the field most likely to change (the advertiser sends a new logo). In the
id, that change mints a *new* id and silently splits the placement's click history in
two. Measured on real data: across 120 ACJ links the four-part pattern collides zero
times, and appending `creative` gains **no** additional separation.

Length: advisory warning over **70** characters (with a count), hard stop at **128**.

---

## loc granularity

If two rows derive the same id, `loc` is usually too coarse rather than the pattern
being wrong. Two banners both at `loc=newsletter` collide — because *newsletter* is a
surface, not a position. `newsletter_top` and `newsletter_bottom` resolve it.

One exception worth knowing: **two sizes of the same banner served responsively are
one slot, not two.** Give them one link id; `device_type` is already captured on every
click and separates them in reporting.

---

## Before you import

- **Destinations with their own query string** (`https://peco.com/?utm_source=…`) are
  encoded into `?to=` automatically and arrive intact. Verified — all params survive,
  and Chapter's own `utm` column is not polluted.
- **`http://` destinations are never rewritten.** Flagged as a warning only; rewriting a
  partner's URL is not ours to do. Confirm they resolve.
- **Partner slugs** new to the client are flagged, as are near-misses against existing
  ones. That near-miss check is the one that catches silent reporting fragmentation.
- **Nothing is written until you confirm.** The tool diffs against the registry field by
  field. A blank incoming value defaults to **keeping** the existing one — an unmapped
  column is far more likely than an intentional clear.

Test one property first. A 50-row diff is a review; a 250-row diff is a scroll.
