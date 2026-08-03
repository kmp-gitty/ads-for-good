// Known-crawler user-agent detection for the pixel-ingest paths (consent /
// identify / collect). Search-engine + social crawlers render JS, so they fire
// the pixel's consent/identify init on page load and would otherwise mint a
// "journey" (identity + consent, zero events) before any real page_view — the
// phantom-journey over-count (Meta meta-externalads + Googlebot-smartphone were
// generating ~9-10k/day on eosfabrics.com). These crawlers identify honestly by
// UA, so a substring filter cleanly excludes them.
//
// Deliberately conservative: real browser UAs never contain bot/crawler/spider
// tokens, so the generic patterns are safe. A missing UA is NOT treated as a bot
// (some legitimate clients omit it) — the phantom crawlers all send one.

const BOT_UA = new RegExp(
  [
    // generic — absent from every real browser UA
    "\\bbot\\b", "bot/", "crawler", "spider", "crawling",
    // search engines
    "googlebot", "google-extended", "bingbot", "slurp", "duckduckbot",
    "baiduspider", "yandex", "sogou", "exabot", "applebot", "petalbot",
    // social / link-preview crawlers (the Meta spike)
    "facebookexternalhit", "facebot", "meta-externalads", "twitterbot",
    "linkedinbot", "pinterest", "redditbot", "whatsapp", "telegrambot",
    "discordbot", "slackbot", "embedly",
    // SEO / AI / archive crawlers
    "semrush", "ahrefsbot", "mj12bot", "dotbot", "bytespider", "gptbot",
    "ccbot", "claudebot", "amazonbot", "ia_archiver", "dataforseo",
    // headless / scripting clients
    "headlesschrome", "phantomjs", "python-requests", "scrapy",
    "curl/", "wget/",
  ].join("|"),
  "i",
);

/** True if the user-agent is a known crawler / bot / scripting client. */
export function isBotUserAgent(ua: string | null | undefined): boolean {
  if (!ua) return false;
  return BOT_UA.test(ua);
}
