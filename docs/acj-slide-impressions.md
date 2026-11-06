# ACJ slide impressions: install and rollout

Counts impressions and viewable impressions for every MetaSlider slide (Block Ads,
End of Story) and every static wrapped image link (partner logos, fixed banners) on
the five ACJ papers, joined to Chapter Links clicks by the `link` ID.

## For ACJ's developer: the snippet

Add once, on every page of all five sites, just before `</body>` (theme footer or
the acj-support mu-plugin). The same snippet goes on every paper.

```html
<script>
(function () {
  var papers = ["philadelphia.today", "montco.today", "delco.today", "bucksco.today", "vista.today"];
  var h = location.hostname.replace(/^www\./, "");
  if (papers.indexOf(h) < 0) return;
  var s = document.createElement("script");
  s.async = true;
  s.src = "https://s." + h + "/api/chapter/imp.js?k=acj_today";
  document.body.appendChild(s);
})();
</script>
```

- Loads from the paper's own Chapter host (`s.delco.today` on Delco, and so on), so it is first party on each paper.
- No jQuery dependency, no layout changes, no markup changes: each slide is identified from its wrapped link.
- Chapter switches papers on and off. On a paper that is not switched on, the script loads and does nothing.
- Requests from ACJ's link checker (`ACJ-LinkCheck` user agent) are ignored.
- It sets one first-party cookie, `up_anon_acj_today`, which is the same visitor ID the wrapped links already set. Readers with Global Privacy Control on, or who opted out, are counted without an ID.

## What is counted

Per slide, per page view:

| Measure | Rule |
|---|---|
| Rendered | The slide became the active slide |
| Impression | The active slide had at least 1px in the viewport, in a visible tab. Once per showing; rotating away and back is a new showing |
| Viewable impression | The same showing was at least 50% in the viewport for 1 continuous second, in a visible tab (30% for slides of 242,500 px or more), per IAB/MRC |

MetaSlider's fade mode stacks all slides in one box and hides inactive ones with
opacity, so only the slide marked `flex-active-slide` is measured.

Static placements (a wrapped Chapter Link around an image, outside any slider, e.g.
the right-rail logos) have one showing per page view: an impression once the image
has 1px in view, viewable once it has been 50% in view for 1 continuous second. A
logo further down the page that the reader never scrolls to is on the page but gets
no impression. Text links are not measured.

## Cross-paper readers

A reader's ID is per paper (the browser keeps a separate cookie per domain). When
a reader clicks from one ACJ paper to another, the link carries their ID
(`chx`, `chxf`), the landing paper's script removes it from the address bar, and
Chapter records both IDs as one reader. Wrapped links whose destination is another
paper do the same in the redirect.

## Rollout (Chapter side)

1. Switch a paper on: `UPDATE chapter_config.clients SET impression_hosts = array_append(coalesce(impression_hosts, '{}'), 'delco.today') WHERE client_key = 'acj_today';`
   Takes effect within about 5 minutes (script cache).
2. Check a few days of Delco against GA page views and the slider's rotation rate.
3. Add the other four papers the same way. Kill switch: remove the host from the array.

## Data

- `chapter_publisher.slide_pageviews`: raw, one row per page view, 180 days.
- `chapter_publisher.slide_daily`: per paper / link / device / day, forever.
- `chapter_publisher.slide_reader_months`: per reader / paper / link / month, 3 years.
- Nightly job `/api/internal/cron/refresh-slide-impressions` (05:45 UTC).
- Report: `select * from chapter_publisher.slide_report('acj_today', '2026-11-01', '2026-11-30');`
