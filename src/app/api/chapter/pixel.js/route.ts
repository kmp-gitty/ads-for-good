import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest) {
  const script = `
(function () {

  var existing = window.ChapterPixel;

  if (existing && existing.__chapterLoaded) return;

  var queue = Array.isArray(existing) ? existing : [];

  function getCurrentScript() {
  if (document.currentScript) return document.currentScript;

  var scripts = document.getElementsByTagName("script");
  for (var i = scripts.length - 1; i >= 0; i--) {
    var s = scripts[i];
    var src = s.getAttribute("src") || "";
    if (src.indexOf("/api/chapter/pixel.js") !== -1 || src.indexOf("/api/pixel.js") !== -1) {
      return s;
    }
  }
  return null;
}

  function getClientKey() {
  var s = getCurrentScript();
  var attr = s && s.getAttribute("data-client-key");
  return attr || null;
}

  // Resolve the API origin from the script's own src so 1P installs (pixel served
  // from a client subdomain like chapter.notsocavalier.com) and 3P installs
  // (pixel served from ads4good.com) both work without per-tag config. Falls
  // back to "" (= page-relative) only if the script src can't be parsed.
  function getApiOrigin() {
    try {
      var s = getCurrentScript();
      var src = s && s.src;
      if (!src) return "";
      var u = new URL(src, window.location.href);
      return u.origin;
    } catch (e) { return ""; }
  }

  function getCollectUrl() {
    var s = getCurrentScript();
    var attr = s && s.getAttribute("data-collect-url");
    if (attr) return attr;
    // /api/chapter/c is the primary endpoint since July 2026 — renamed from
    // /api/chapter/collect to defuse ad-blocker filter-list rules that pattern-
    // match on the substring "collect" (GA endpoint fingerprint). The old
    // /collect path stays live as an alias so any cached pixel or explicit
    // data-collect-url override still works.
    return (getApiOrigin() || "") + "/api/chapter/c";
  }

   function getIdentifyUrl() {
    var s = getCurrentScript();
    var attr = s && s.getAttribute("data-identify-url");
    if (attr) return attr;
    return (getApiOrigin() || "") + "/api/identify";
  }

    function getBufferKey(clientKey) {
    return "chapter_event_buffer_" + clientKey;
  }

  function readBuffer(clientKey) {
    try {
      var raw = localStorage.getItem(getBufferKey(clientKey));
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

function getJourneyStorageKey(clientKey) {
  return "chapter_journey_" + clientKey;
}

function getAnonStorageKey(clientKey) {
  return "chapter_anon_" + clientKey;
}

function readStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    if (value) localStorage.setItem(key, value);
  } catch (e) {}
}

// Cross-subdomain cookie fallback. Pixel API + redirect handler both set
// up_anon_<client_key> and up_journey_<client_key> on the eTLD+1 apex
// (e.g. .notsocavalier.com). When a visitor first lands on the storefront via
// a redirect (chapter.notsocavalier.com/r/... → 302 to notsocavalier.com),
// localStorage is empty (localStorage is origin-scoped) but the cookie set by
// the redirect is visible here. Reading it as a fallback prevents the pixel
// from minting a fresh anonymous_id in that case.
var CHAPTER_UUID_REGEX = /^[0-9a-fA-F-]{36}$/;
function readCookieValue(name) {
  try {
    var parts = document.cookie.split(";");
    for (var i = 0; i < parts.length; i++) {
      var trimmed = parts[i].replace(/^\s+/, "");
      if (trimmed.indexOf(name + "=") === 0) {
        return decodeURIComponent(trimmed.substring(name.length + 1));
      }
    }
  } catch (e) {}
  return null;
}

function getOrCreateId(storageKey) {
  try {
    var existing = readStorage(storageKey);
    if (existing) return existing;

    var created = (window.crypto && window.crypto.randomUUID)
      ? window.crypto.randomUUID()
      : String(Date.now()) + "_" + String(Math.random()).slice(2);

    writeStorage(storageKey, created);
    return created;
  } catch (e) {
    return null;
  }
}

// getOrCreateId + cookie fallback. Priority:
//   1. localStorage (fastest, most stable within the origin)
//   2. Shared-apex cookie set by pixel API or redirect handler
//   3. Mint a new UUID and persist it to localStorage
function getOrCreateIdWithCookieFallback(storageKey, cookieName) {
  var existing = readStorage(storageKey);
  if (existing) return existing;

  var fromCookie = readCookieValue(cookieName);
  if (fromCookie && CHAPTER_UUID_REGEX.test(fromCookie)) {
    writeStorage(storageKey, fromCookie);
    return fromCookie;
  }

  return getOrCreateId(storageKey);
}

  function writeBuffer(clientKey, events) {
    try {
      localStorage.setItem(getBufferKey(clientKey), JSON.stringify(events || []));
    } catch (e) {}
  }

  function pushToBuffer(clientKey, body) {
    try {
      var events = readBuffer(clientKey);
      events.push(body);
      writeBuffer(clientKey, events);
    } catch (e) {}
  }

  function removeFromBuffer(clientKey, matchId) {
    try {
      var events = readBuffer(clientKey);
      var next = [];
      for (var i = 0; i < events.length; i++) {
        if (!events[i] || events[i]._buffer_id !== matchId) {
          next.push(events[i]);
        }
      }
      writeBuffer(clientKey, next);
    } catch (e) {}
  }

  var clientKey = getClientKey();
  var collectUrl = getCollectUrl();
  var identifyUrl = getIdentifyUrl();
  var cachedJourneyId = clientKey ? getOrCreateIdWithCookieFallback(getJourneyStorageKey(clientKey), "up_journey_" + clientKey) : null;
  var cachedAnonId = clientKey ? getOrCreateIdWithCookieFallback(getAnonStorageKey(clientKey), "up_anon_" + clientKey) : null;

    function shouldIgnoreChapterTracking() {
    try {
      var host = window.location.hostname;
      var isLocal =
        host === "localhost" ||
        host === "127.0.0.1";

      var ignoreFlag = localStorage.getItem("chapter_ignore") === "true";

      return isLocal || ignoreFlag;
    } catch (e) {
      return false;
    }
  }

  if (shouldIgnoreChapterTracking()) {
  console.log("Chapter: tracking disabled");  
  window.ChapterPixel = {
      __chapterLoaded: true,
      track: function () {},
      identify: function () {},
      push: function () {}
    };
    return;
  }

    function send(eventName, props) {
    if (!clientKey) return;

    try {
      var journeyId = cachedJourneyId;
var anonId = cachedAnonId;

if (!journeyId) {
  journeyId = getOrCreateIdWithCookieFallback(getJourneyStorageKey(clientKey), "up_journey_" + clientKey);
  cachedJourneyId = journeyId;
}

if (!anonId) {
  anonId = getOrCreateIdWithCookieFallback(getAnonStorageKey(clientKey), "up_anon_" + clientKey);
  cachedAnonId = anonId;
}

      var body = {
        _buffer_id: (window.crypto && window.crypto.randomUUID)
          ? window.crypto.randomUUID()
          : String(Date.now()) + "_" + String(Math.random()).slice(2),
        client_key: clientKey,
        event_name: eventName,
        internal_ignore: shouldIgnoreChapterTracking(),
        journey_id: journeyId,
        anonymous_id: anonId,
        page_url: window.location.href,
        page_path: window.location.pathname,
        referrer: document.referrer || null,
        props: props || {},
        // Actual visitor consent state read from chapter_consent cookie.
        // Defaults to "unknown" when no cookie is set — the server's
        // consent_mode policy decides what to do with "unknown".
        consent_status: chapterReadConsent(),
        // consent_mode = the per-client default policy when status is unknown.
        // "opt_in" = US-style (collect unless explicit opt-out).
        // "opt_out" = EU-strict (don't collect unless explicit opt-in).
        // Today hardcoded "opt_out" matching prior behavior; future op a
        // per-client config knob.
        consent_mode: "opt_out"
      };

      pushToBuffer(clientKey, body);

      fetch(collectUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        keepalive: true,
        body: JSON.stringify(body)
      })
        .then(function (res) {
          if (res && (res.ok || res.status === 204)) {
            removeFromBuffer(clientKey, body._buffer_id);
          }
        })
        .catch(function () {});
    } catch (e) {}
  }

    function replayBufferedEvents() {
    try {
      if (!clientKey) return;

      var events = readBuffer(clientKey);
      if (!events || !events.length) return;

      for (var i = 0; i < events.length; i++) {
        (function (bufferedBody) {
          fetch(collectUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            keepalive: true,
            body: JSON.stringify(bufferedBody)
          })
            .then(function (res) {
              if (res && (res.ok || res.status === 204)) {
                removeFromBuffer(clientKey, bufferedBody._buffer_id);
              }
            })
            .catch(function () {});
        })(events[i]);
      }
    } catch (e) {}
  }

  // Consent helpers (read from storefront-domain cookie).
  function chapterReadConsent() {
    try {
      var match = document.cookie.match(/(?:^|;\s*)chapter_consent=([^;]+)/);
      if (!match) return "unknown";
      var v = decodeURIComponent(match[1]);
      if (v === "opt_in" || v === "opt_out") return v;
      return "unknown";
    } catch (e) {
      return "unknown";
    }
  }

  function chapterWriteConsentCookie(state) {
    // Write on storefront origin (current host). Lax+Secure for typical
    // first-party use; HTTPS-only.
    try {
      var maxAge = 60 * 60 * 24 * 365; // 1 year
      document.cookie =
        "chapter_consent=" + encodeURIComponent(state) +
        "; Path=/; Max-Age=" + maxAge +
        "; SameSite=Lax" +
        (location.protocol === "https:" ? "; Secure" : "");
    } catch (e) {}
  }

  function chapterPostConsent(state) {
    // Tell server: writes to consent_events + journey + propagates a
    // chapter_consent cookie to the API/redirect origin so /r/<key>/<slug>
    // reads the right state on next click.
    try {
      var apiOrigin = getApiOrigin() || "https://ads4good.com";
      var url = apiOrigin + "/api/consent";
      fetch(url, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({
          client_key: clientKey,
          consent_status: state,
          consent_mode: "opt_out",
          consent_ts: new Date().toISOString(),
          source: "storefront_banner",
          page_url: window.location.href,
          page_path: window.location.pathname,
          referrer: document.referrer || null,
        }),
      }).catch(function () {});
    } catch (e) {}
  }

  var api = {
    __chapterLoaded: true,
    track: function (eventName, props) {
      send(eventName, props);
    },
    setConsent: function (state) {
      // Public API for storefront cookie banners. Pass "opt_in" or "opt_out".
      // Sets local cookie immediately (so the next event in this session
      // uses the new value) AND posts to /api/consent (so the redirect
      // domain learns about it).
      if (state !== "opt_in" && state !== "opt_out") return;
      chapterWriteConsentCookie(state);
      chapterPostConsent(state);
    },
    identify: function (props) {
      try {
        fetch(identifyUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          keepalive: true,
          body: JSON.stringify({
            client_key: clientKey,
            identity_key: props && props.identity_key ? props.identity_key : null,
            previous_identity_key: props && props.previous_identity_key ? props.previous_identity_key : null,
            traits: props && props.traits ? props.traits : null,
            page_url: window.location.href,
            page_path: window.location.pathname,
            referrer: document.referrer || null
          })
        }).catch(function () {});
      } catch (e) {}
    },
    push: function (args) {
      if (!args || !args.length) return;
      var method = args[0];
      if (method === "track") {
        api.track(args[1], args[2] || {});
      } else if (method === "identify") {
        api.identify(args[1] || {});
      } else if (method === "setConsent") {
        api.setConsent(args[1]);
      }
    }
  };

    window.ChapterPixel = api;

  // Tier 1 redirect handoff (solution 1): if this landing has a ?chid=...
  // param, the visitor arrived via a Chapter /r/... redirect that minted an
  // anonymous identity on a different apex. Alias that redirect identity to
  // this pixel's anonymous_id so events on this domain stitch back to the
  // original click. Then strip chid+jid from the URL so it doesn't leak via
  // share/screenshot/referrer. Runs once per page load before the page_view
  // fires (so the page_view's referrer reflects the cleaned URL).
  try {
    var params = new URLSearchParams(window.location.search);
    var chid = params.get("chid");
    if (chid && clientKey) {
      var pixelAnonId = cachedAnonId || getOrCreateIdWithCookieFallback(getAnonStorageKey(clientKey), "up_anon_" + clientKey);
      cachedAnonId = pixelAnonId;
      if (chid !== pixelAnonId) {
        fetch(identifyUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          keepalive: true,
          body: JSON.stringify({
            client_key: clientKey,
            identity_key: pixelAnonId,
            previous_identity_key: chid
          })
        }).catch(function () {});
      }
      // Clean handoff params out of the URL.
      params.delete("chid");
      params.delete("jid");
      var newQs = params.toString();
      var newUrl = window.location.pathname + (newQs ? "?" + newQs : "") + window.location.hash;
      if (window.history && window.history.replaceState) {
        window.history.replaceState({}, document.title, newUrl);
      }
    }
  } catch (e) {}

  replayBufferedEvents();

  for (var i = 0; i < queue.length; i++) {
    api.push(queue[i]);
  }

  api.track("page_view", {
    page_title: document.title || null,
    page_type: "site_page"
  });

  var scrollMarks = { 25: false, 50: false, 75: false, 90: false };

  function getScrollPercent() {
    var doc = document.documentElement;
    var body = document.body;
    var scrollTop = window.pageYOffset || doc.scrollTop || body.scrollTop || 0;
    var scrollHeight = Math.max(
      body.scrollHeight, doc.scrollHeight,
      body.offsetHeight, doc.offsetHeight,
      body.clientHeight, doc.clientHeight
    );
    var winHeight = window.innerHeight || doc.clientHeight || 0;

    var trackable = scrollHeight - winHeight;
    if (trackable <= 0) return 100;

    return Math.round((scrollTop / trackable) * 100);
  }

  function handleScrollDepth() {
    var pct = getScrollPercent();
    [25, 50, 75, 90].forEach(function (mark) {
      if (!scrollMarks[mark] && pct >= mark) {
        scrollMarks[mark] = true;
        api.track("scroll_depth", { percent: mark });
      }
    });
  }

  window.addEventListener("scroll", handleScrollDepth, { passive: true });

var hoverTimer = null;
var hoverTarget = null;

function getClickableLabel(el) {
  if (!el) return null;

  return (
    el.innerText?.trim()?.slice(0, 100) ||
    el.getAttribute("aria-label") ||
    el.getAttribute("data-label") ||
    el.id ||
    el.className ||
    el.tagName
  );
}

function getElementProps(el) {
  if (!el) return {};
  var sectionParent = el.closest("section, nav, header, footer, main, aside");
  return {
    label: getClickableLabel(el),
    tag: el.tagName,
    href: el.tagName === "A" ? (el.getAttribute("href") || null) : null,
    element_id: el.id || null,
    element_class: (typeof el.className === "string" ? el.className : null) || null,
    aria_label: el.getAttribute("aria-label") || null,
    page_section: sectionParent
      ? (sectionParent.getAttribute("aria-label") || sectionParent.id || sectionParent.tagName)
      : null
  };
}

document.addEventListener("mouseover", function (e) {
  var el = e.target.closest("a, button");

  if (!el) return;

  hoverTarget = el;

  hoverTimer = setTimeout(function () {
    if (hoverTarget === el) {
      api.track("hover_intent", getElementProps(el));
    }
  }, 500);
});

document.addEventListener("mouseout", function (e) {
  if (hoverTimer) {
    clearTimeout(hoverTimer);
    hoverTimer = null;
  }
  hoverTarget = null;
});

var timeMarks = { 10: false, 30: false, 60: false };
var activeSeconds = 0;

setInterval(function () {
  if (document.visibilityState !== "visible") return;

  activeSeconds += 1;

  if (activeSeconds >= 10 && !timeMarks[10]) {
    timeMarks[10] = true;
    api.track("time_on_page", { seconds: 10 });
  }

  if (activeSeconds >= 30 && !timeMarks[30]) {
    timeMarks[30] = true;
    api.track("time_on_page", { seconds: 30 });
  }

  if (activeSeconds >= 60 && !timeMarks[60]) {
    timeMarks[60] = true;
    api.track("time_on_page", { seconds: 60 });
  }
}, 1000);

  document.addEventListener("visibilitychange", function () {
    api.track("visibility_change", {
      state: document.visibilityState
    });
  });

  window.addEventListener("beforeunload", function () {
    api.track("page_exit", {});
  });

  // ============ Option D — Identity prompts ============
  // Operator-configured popups that fire on trigger conditions, capture email,
  // and optionally display a discount code. Submit fires /api/identify (so
  // identity lands in canon immediately) plus an analytics event so operators
  // measure show → submit conversion in the dashboard.

  function chapterHashEmail(email) {
    if (!email || !crypto || !crypto.subtle) return Promise.resolve(null);
    var normalized = String(email).trim().toLowerCase();
    var data = new TextEncoder().encode(normalized);
    return crypto.subtle.digest("SHA-256", data).then(function (buf) {
      var arr = Array.from(new Uint8Array(buf));
      return arr.map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
    });
  }

  // E.164 normalization: strip non-digits, default to +1 for 10-digit US numbers.
  function chapterNormalizePhone(raw) {
    if (!raw) return null;
    var digits = String(raw).replace(/[^0-9]/g, "");
    if (!digits) return null;
    if (digits.length === 10) return "+1" + digits;
    if (digits.length === 11 && digits[0] === "1") return "+" + digits;
    if (digits.length >= 10 && digits.length <= 15) return "+" + digits;
    return null;
  }

  function chapterValidEmail(email) {
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(email).trim());
  }

  function chapterHashPhone(phone) {
    if (!phone || !crypto || !crypto.subtle) return Promise.resolve(null);
    var normalized = chapterNormalizePhone(phone);
    if (!normalized) return Promise.resolve(null);
    var data = new TextEncoder().encode(normalized);
    return crypto.subtle.digest("SHA-256", data).then(function (buf) {
      var arr = Array.from(new Uint8Array(buf));
      return arr.map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
    });
  }

  function chapterFrequencyKey(slug) { return "chapter_prompt_" + slug; }

  function chapterPromptShownThisSession(slug) {
    try { return sessionStorage.getItem(chapterFrequencyKey(slug)) === "1"; } catch (e) { return false; }
  }
  function chapterMarkPromptShownSession(slug) {
    try { sessionStorage.setItem(chapterFrequencyKey(slug), "1"); } catch (e) {}
  }
  function chapterPromptShownForVisitor(slug, days) {
    try {
      var raw = localStorage.getItem(chapterFrequencyKey(slug));
      if (!raw) return false;
      var ts = parseInt(raw, 10);
      if (!ts) return false;
      var ageMs = Date.now() - ts;
      var maxAgeMs = (days || 90) * 86400000;
      return ageMs < maxAgeMs;
    } catch (e) { return false; }
  }
  function chapterMarkPromptShownVisitor(slug) {
    try { localStorage.setItem(chapterFrequencyKey(slug), String(Date.now())); } catch (e) {}
  }

  function chapterIsPromptThrottled(prompt) {
    if (!prompt || !prompt.slug) return false;
    var freq = prompt.frequency || "session";
    if (freq === "session") return chapterPromptShownThisSession(prompt.slug);
    if (freq === "visitor") return chapterPromptShownForVisitor(prompt.slug, prompt.frequency_days);
    return false; // every_visit
  }
  function chapterRecordPromptShown(prompt) {
    if (!prompt || !prompt.slug) return;
    var freq = prompt.frequency || "session";
    if (freq === "session") chapterMarkPromptShownSession(prompt.slug);
    else if (freq === "visitor") chapterMarkPromptShownVisitor(prompt.slug);
  }

  function chapterInjectPromptStyles() {
    if (document.getElementById("chapter-prompt-styles")) return;
    var style = document.createElement("style");
    style.id = "chapter-prompt-styles";
    style.textContent = [
      ".chapter-prompt-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:2147483640;display:flex;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;}",
      ".chapter-prompt-card{background:#fff;border-radius:12px;padding:24px;max-width:380px;width:90%;box-shadow:0 10px 40px rgba(0,0,0,.2);position:relative;}",
      ".chapter-prompt-close{position:absolute;top:8px;right:12px;background:transparent;border:0;font-size:22px;cursor:pointer;color:#888;line-height:1;padding:4px 8px;}",
      ".chapter-prompt-headline{font-size:18px;font-weight:600;margin:0 0 8px;color:#1F2D43;}",
      ".chapter-prompt-body{font-size:14px;color:#5C6B82;margin:0 0 16px;line-height:1.5;}",
      ".chapter-prompt-field-label{display:block;font-size:11px;font-weight:600;color:#5C6B82;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.04em;}",
      ".chapter-prompt-input{width:100%;padding:10px 12px;border:1px solid #C7BFAA;border-radius:8px;font-size:14px;color:#1F2D43;background:#fff;box-sizing:border-box;outline:none;margin-bottom:10px;}",
      ".chapter-prompt-input::placeholder{color:#8B95A6;opacity:1;}",
      ".chapter-prompt-input:focus{border-color:#E36410;}",
      ".chapter-prompt-error{font-size:12px;color:#B91C1C;margin:-4px 0 8px;}",
      ".chapter-prompt-link-btn{display:inline-block;margin-top:12px;padding:10px 16px;background:#E36410;color:#fff;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;text-align:center;}",
      ".chapter-prompt-link-btn:hover{background:#C9550B;}",
      ".chapter-prompt-button{margin-top:12px;width:100%;padding:10px;background:#E36410;color:#fff;border:0;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;}",
      ".chapter-prompt-button:hover{background:#C9550B;}",
      ".chapter-prompt-button:disabled{opacity:.5;cursor:default;}",
      ".chapter-prompt-success-msg{font-size:14px;color:#2E7D5B;margin:0 0 8px;font-weight:500;}",
      ".chapter-prompt-offer{background:#FBE6D2;border:1px dashed #E36410;border-radius:8px;padding:12px;margin-top:8px;text-align:center;}",
      ".chapter-prompt-offer-code{font-family:monospace;font-size:18px;font-weight:700;color:#1F2D43;letter-spacing:.05em;}",
      ".chapter-prompt-offer-desc{font-size:12px;color:#5C6B82;margin-top:4px;}",
      // MI v2 Phase 4 — bubble container (Custom Notification preset)
      ".chapter-prompt-bubble{position:fixed;z-index:2147483640;background:#fff;border-radius:12px;padding:20px;max-width:340px;width:calc(100% - 32px);box-shadow:0 8px 32px rgba(31,45,67,.18);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;animation:chapter-bubble-in .25s ease-out;}",
      ".chapter-prompt-bubble-bottom-right{bottom:24px;right:24px;}",
      ".chapter-prompt-bubble-bottom-left{bottom:24px;left:24px;}",
      ".chapter-prompt-bubble-top-right{top:24px;right:24px;}",
      ".chapter-prompt-bubble-top-left{top:24px;left:24px;}",
      "@keyframes chapter-bubble-in{from{transform:translateY(12px);opacity:0;}to{transform:translateY(0);opacity:1;}}",
      ".chapter-prompt-yesno{display:flex;gap:8px;margin-top:12px;}",
      ".chapter-prompt-yesno button{flex:1;padding:10px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;border:0;}",
      ".chapter-prompt-yesno .chapter-yes{background:#E36410;color:#fff;}",
      ".chapter-prompt-yesno .chapter-yes:hover{background:#C9550B;}",
      ".chapter-prompt-yesno .chapter-no{background:#F1ECDF;color:#1F2D43;}",
      ".chapter-prompt-yesno .chapter-no:hover{background:#E5DDC8;}",
      // MI v2 Phase 4 — phone CTA (Phone Call preset)
      ".chapter-prompt-phone-cta{display:flex;align-items:center;justify-content:space-between;width:100%;padding:12px 16px;margin-top:8px;background:#fff;border:1px solid #E36410;border-radius:8px;color:#E36410;text-decoration:none;font-size:14px;font-weight:600;}",
      ".chapter-prompt-phone-cta:hover{background:#FFF4EC;}",
      ".chapter-prompt-phone-cta-label{}",
      ".chapter-prompt-phone-cta-number{font-family:monospace;font-size:13px;opacity:.85;}",
    ].join("");
    document.head.appendChild(style);
  }

  // Moment Identity v2 — preset_type dispatch.
  //
  // Existing v1.5 prompts (preset_type='email_exchange') route through V1.
  // Phase 2 custom_form routes through Composable. Phase 4 adds bubble
  // (Custom Notification) + Phone Call renderers. make_an_offer + remind_me
  // fall through to Composable for now (Phase 5/6 will replace).
  function chapterRenderPrompt(prompt) {
    var presetType = prompt.preset_type || "email_exchange";
    if (presetType === "email_exchange") return chapterRenderPromptV1(prompt);
    if (presetType === "custom_notification") return chapterRenderPromptBubble(prompt);
    if (presetType === "phone_call") return chapterRenderPromptPhoneCall(prompt);
    if (presetType === "make_an_offer") return chapterRenderPromptMakeAnOffer(prompt);
    return chapterRenderPromptComposable(prompt);
  }

  // MI v2 Phase 4 — bubble container (Custom Notification preset).
  // Fixed corner position, no backdrop, slide-in animation, dismissible.
  // Supports content blocks (headline, body) + a single CTA (button/yes_no/dismiss_only).
  function chapterRenderPromptBubble(prompt) {
    chapterInjectPromptStyles();
    var container = prompt.container_jsonb || {};
    var actions = prompt.submit_actions_jsonb || {};
    var position = container.position || "bottom-right";
    var contentBlocks = Array.isArray(prompt.content_blocks_jsonb) ? prompt.content_blocks_jsonb : [];

    var bubble = document.createElement("div");
    bubble.className = "chapter-prompt-bubble chapter-prompt-bubble-" + position;

    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "chapter-prompt-close";
    closeBtn.textContent = "×";
    closeBtn.setAttribute("aria-label", "Dismiss");
    bubble.appendChild(closeBtn);

    contentBlocks.forEach(function (block) {
      if (!block || !block.type) return;
      if (block.type === "headline") {
        var h = document.createElement("h3");
        h.className = "chapter-prompt-headline";
        h.textContent = String(block.text || "");
        bubble.appendChild(h);
      } else if (block.type === "body") {
        var p = document.createElement("p");
        p.className = "chapter-prompt-body";
        p.textContent = String(block.text || "");
        bubble.appendChild(p);
      }
    });

    function dismiss(method, choice) {
      if (bubble.parentNode) bubble.parentNode.removeChild(bubble);
      var props = { prompt_slug: prompt.slug, preset_type: prompt.preset_type, dismiss_method: method };
      if (choice) props.choice = choice;
      api.track("identity_prompt_dismissed", props);
    }

    function showAck() {
      while (bubble.firstChild) bubble.removeChild(bubble.firstChild);
      var ack = document.createElement("div");
      ack.style.cssText = "font-size:13.5px;color:#1F2D43;line-height:1.45;padding:4px 2px;";
      ack.textContent = actions.ack_message || "Thanks!";
      bubble.appendChild(ack);
      setTimeout(function () { if (bubble.parentNode) bubble.parentNode.removeChild(bubble); }, 3500);
    }

    var ctaType = actions.cta_type || "dismiss_only";
    if (ctaType === "yes_no") {
      var wrap = document.createElement("div");
      wrap.className = "chapter-prompt-yesno";
      var yesBtn = document.createElement("button");
      yesBtn.type = "button";
      yesBtn.className = "chapter-yes";
      yesBtn.textContent = actions.yes_label || "Yes";
      var noBtn = document.createElement("button");
      noBtn.type = "button";
      noBtn.className = "chapter-no";
      noBtn.textContent = actions.no_label || "No thanks";
      yesBtn.addEventListener("click", function () {
        api.track("identity_prompt_submitted", { prompt_slug: prompt.slug, preset_type: prompt.preset_type, choice: "yes" });
        if (actions.yes_url) { try { window.location.href = String(actions.yes_url); } catch (e) {} dismiss("yes_clicked", "yes"); return; }
        if (actions.ack_message) { showAck(); return; }
        dismiss("yes_clicked", "yes");
      });
      noBtn.addEventListener("click", function () { dismiss("no_clicked", "no"); });
      wrap.appendChild(yesBtn);
      wrap.appendChild(noBtn);
      bubble.appendChild(wrap);
    } else if (ctaType === "button") {
      var btn = document.createElement("a");
      btn.className = "chapter-prompt-link-btn";
      btn.style.display = "block";
      btn.style.textAlign = "center";
      btn.href = String(actions.cta_url || "#");
      btn.textContent = actions.cta_label || "Open";
      btn.addEventListener("click", function (e) {
        api.track("identity_prompt_submitted", { prompt_slug: prompt.slug, preset_type: prompt.preset_type });
        if (!actions.cta_url && actions.ack_message) { if (e && e.preventDefault) e.preventDefault(); showAck(); }
      });
      bubble.appendChild(btn);
    }
    // 'dismiss_only': no CTA, just the close button.

    closeBtn.addEventListener("click", function () { dismiss("close_button"); });

    document.body.appendChild(bubble);
    chapterRecordPromptShown(prompt);
    api.track("identity_prompt_shown", { prompt_slug: prompt.slug, preset_type: prompt.preset_type, container: "bubble" });
  }

  // MI v2 Phase 4 — Phone Call preset.
  // Modal layout, content blocks + N tel: CTA buttons. No form, no identity
  // capture. Each tel: click fires phone_call_initiated with the masked number.
  function chapterRenderPromptPhoneCall(prompt) {
    chapterInjectPromptStyles();
    var contentBlocks = Array.isArray(prompt.content_blocks_jsonb) ? prompt.content_blocks_jsonb : [];

    var backdrop = document.createElement("div");
    backdrop.className = "chapter-prompt-backdrop";
    var card = document.createElement("div");
    card.className = "chapter-prompt-card";

    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "chapter-prompt-close";
    closeBtn.textContent = "×";
    closeBtn.setAttribute("aria-label", "Close");
    card.appendChild(closeBtn);

    contentBlocks.forEach(function (block) {
      if (!block || !block.type) return;
      if (block.type === "headline") {
        var h = document.createElement("h3");
        h.className = "chapter-prompt-headline";
        h.textContent = String(block.text || "");
        card.appendChild(h);
      } else if (block.type === "body") {
        var p = document.createElement("p");
        p.className = "chapter-prompt-body";
        p.textContent = String(block.text || "");
        card.appendChild(p);
      } else if (block.type === "phone_cta") {
        var num = String(block.phone_number || "");
        var lbl = String(block.label || num);
        if (!num) return;
        var a = document.createElement("a");
        a.className = "chapter-prompt-phone-cta";
        a.href = "tel:" + num;
        var labelSpan = document.createElement("span");
        labelSpan.className = "chapter-prompt-phone-cta-label";
        labelSpan.textContent = lbl;
        var numSpan = document.createElement("span");
        numSpan.className = "chapter-prompt-phone-cta-number";
        numSpan.textContent = num;
        a.appendChild(labelSpan);
        a.appendChild(numSpan);
        a.addEventListener("click", function () {
          // Hash phone number client-side for the event (privacy: never log raw).
          chapterHashPhone(num).then(function (h) {
            api.track("phone_call_initiated", {
              prompt_slug: prompt.slug,
              preset_type: prompt.preset_type,
              cta_label: lbl,
              phone_sha256: h || null,
            });
          });
        });
        card.appendChild(a);
      }
    });

    function dismiss(method) {
      if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
      api.track("identity_prompt_dismissed", {
        prompt_slug: prompt.slug,
        preset_type: prompt.preset_type,
        dismiss_method: method,
      });
    }
    closeBtn.addEventListener("click", function () { dismiss("close_button"); });
    backdrop.addEventListener("click", function (e) { if (e.target === backdrop) dismiss("backdrop_click"); });

    backdrop.appendChild(card);
    document.body.appendChild(backdrop);
    chapterRecordPromptShown(prompt);
    api.track("identity_prompt_shown", { prompt_slug: prompt.slug, preset_type: prompt.preset_type, container: "modal" });
  }

  // Phase 2A/2B — composable renderer for Custom Form preset.
  //
  // Detects multi-page mode from pages_jsonb. Single-page is the trivial
  // case (1 synthetic page from root content_blocks_jsonb + form_fields_jsonb).
  // Multi-page: Back + Next navigation, optional progress dots, accumulated
  // values across pages, identity hashing + POST run once at final Submit.
  //
  // Modal container only (drawer/bubble/inline land in Phase 4).
  // Field types: email, phone, text, textarea, single_choice, multi_choice.
  // Conditional branching between pages deferred to Phase 2B.1.
  function chapterRenderPromptComposable(prompt) {
    chapterInjectPromptStyles();

    // Resolve pages: pages_jsonb wins; otherwise synthesize a single page
    // from root content_blocks_jsonb + form_fields_jsonb (Phase 2A shape).
    var pagesConfig = prompt.pages_jsonb && Array.isArray(prompt.pages_jsonb.pages)
      ? prompt.pages_jsonb
      : null;
    var pages;
    var progressIndicator = false;
    var backButton = true;
    var branchingRules = [];
    if (pagesConfig && pagesConfig.pages.length > 0) {
      pages = pagesConfig.pages;
      progressIndicator = !!pagesConfig.progress_indicator;
      backButton = pagesConfig.back_button !== false;  // default true
      branchingRules = Array.isArray(pagesConfig.branching) ? pagesConfig.branching : [];
    } else {
      pages = [{
        id: "_single",
        content_blocks: Array.isArray(prompt.content_blocks_jsonb) ? prompt.content_blocks_jsonb : [],
        form_fields: Array.isArray(prompt.form_fields_jsonb) ? prompt.form_fields_jsonb : [],
      }];
    }

    // DOM scaffolding shared across page navigations.
    var backdrop = document.createElement("div");
    backdrop.className = "chapter-prompt-backdrop";
    var card = document.createElement("div");
    card.className = "chapter-prompt-card";

    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "chapter-prompt-close";
    closeBtn.textContent = "×";
    closeBtn.setAttribute("aria-label", "Close");
    card.appendChild(closeBtn);

    var form = document.createElement("form");
    var contentArea = document.createElement("div");  // gets cleared+repopulated per page
    form.appendChild(contentArea);

    // Honeypot lives on the form, not in the content area — preserved across pages.
    var honeypotInput = document.createElement("input");
    honeypotInput.type = "text";
    honeypotInput.name = "hp_field";
    honeypotInput.tabIndex = -1;
    honeypotInput.autocomplete = "off";
    honeypotInput.setAttribute("aria-hidden", "true");
    honeypotInput.style.cssText =
      "position:absolute;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;";
    form.appendChild(honeypotInput);

    var errorEl = document.createElement("p");
    errorEl.className = "chapter-prompt-error";
    errorEl.style.display = "none";
    form.appendChild(errorEl);

    var navWrap = document.createElement("div");
    navWrap.style.cssText = "display:flex;gap:8px;align-items:center;margin-top:12px;";
    form.appendChild(navWrap);

    card.appendChild(form);
    backdrop.appendChild(card);
    document.body.appendChild(backdrop);

    chapterRecordPromptShown(prompt);
    api.track("identity_prompt_shown", { prompt_slug: prompt.slug, preset_type: prompt.preset_type });

    // MI v2 Phase 2C — recovery flow state
    var recoveryConfig = prompt.recovery_jsonb && prompt.recovery_jsonb.enabled
      ? prompt.recovery_jsonb
      : null;
    var recoveryAttempts = 0;
    var inRecovery = false;

    function triggerRecovery() {
      if (!recoveryConfig) return false;
      var maxAttempts = recoveryConfig.max_attempts || 1;
      if (recoveryAttempts >= maxAttempts) return false;
      if (inRecovery) return false;  // can't recover from a recovery (one shot)
      recoveryAttempts++;
      inRecovery = true;

      // Replace pages with a single synthetic recovery page; clear all
      // accumulated values + branching (recovery is its own submission).
      pages = [{
        id: "_recovery",
        content_blocks: Array.isArray(recoveryConfig.content_blocks) ? recoveryConfig.content_blocks : [],
        form_fields: Array.isArray(recoveryConfig.form_fields) ? recoveryConfig.form_fields : [],
      }];
      branchingRules = [];
      accumulatedValues = {};
      fieldConfigsById = {};

      api.track("identity_prompt_recovery_shown", {
        prompt_slug: prompt.slug,
        preset_type: prompt.preset_type,
      });
      renderPage(0);
      return true;
    }

    function dismiss(method) {
      // First close attempt fires recovery if configured. Subsequent closes
      // (or close inside recovery) actually dismiss.
      if (method === "close_button" && triggerRecovery()) return;
      if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
      api.track("identity_prompt_dismissed", {
        prompt_slug: prompt.slug,
        preset_type: prompt.preset_type,
        dismiss_method: method,
        in_recovery: inRecovery,
      });
    }
    closeBtn.addEventListener("click", function () { dismiss("close_button"); });
    backdrop.addEventListener("click", function (e) { if (e.target === backdrop) dismiss("backdrop_click"); });

    function showError(msg) {
      errorEl.textContent = msg;
      errorEl.style.display = "block";
    }

    // Cross-page state.
    var currentPageIdx = 0;
    var accumulatedValues = {};      // field_id -> value (string | string[])
    var fieldConfigsById = {};       // field_id -> field config (for identity-flag lookup at submit)
    var currentPageRefs = {};        // field_id -> { kind, el / els, config } for THIS page

    function buildContentBlock(block) {
      if (!block || !block.type) return null;
      if (block.type === "headline") {
        var h = document.createElement("h3");
        h.className = "chapter-prompt-headline";
        h.textContent = String(block.text || "");
        return h;
      } else if (block.type === "body") {
        var p = document.createElement("p");
        p.className = "chapter-prompt-body";
        p.textContent = String(block.text || "");
        return p;
      }
      return null;
    }

    function buildFormField(field) {
      var wrap = document.createElement("div");
      if (field.label) {
        var lbl = document.createElement("label");
        lbl.className = "chapter-prompt-field-label";
        lbl.textContent = String(field.label) + (field.required ? " *" : "");
        wrap.appendChild(lbl);
      }
      var prev = accumulatedValues[field.id];  // restore prior value on Back nav

      if (field.type === "text" || field.type === "email" || field.type === "phone" || field.type === "number") {
        var inp = document.createElement("input");
        inp.type = field.type === "email" ? "email" : (field.type === "phone" ? "tel" : (field.type === "number" ? "number" : "text"));
        if (field.type === "number") inp.setAttribute("inputmode", "decimal");
        inp.className = "chapter-prompt-input";
        if (field.placeholder) inp.placeholder = String(field.placeholder);
        if (field.required) inp.required = true;
        if (field.type === "email") inp.autocomplete = "email";
        else if (field.type === "phone") inp.autocomplete = "tel";
        if (typeof prev === "string") inp.value = prev;
        wrap.appendChild(inp);
        currentPageRefs[field.id] = { kind: "input", el: inp, config: field };
      } else if (field.type === "textarea") {
        var ta = document.createElement("textarea");
        ta.className = "chapter-prompt-input";
        ta.rows = 3;
        if (field.placeholder) ta.placeholder = String(field.placeholder);
        if (field.required) ta.required = true;
        if (typeof prev === "string") ta.value = prev;
        wrap.appendChild(ta);
        currentPageRefs[field.id] = { kind: "input", el: ta, config: field };
      } else if (field.type === "single_choice" || field.type === "multi_choice") {
        var options = Array.isArray(field.options) ? field.options : [];
        var inputs = [];
        options.forEach(function (opt, optIdx) {
          var optLabel = document.createElement("label");
          optLabel.style.cssText = "display:block;margin:4px 0;font-size:13px;color:#1F2D43;cursor:pointer;";
          var radio = document.createElement("input");
          radio.type = field.type === "single_choice" ? "radio" : "checkbox";
          radio.name = field.id;
          radio.value = String(opt);
          radio.style.cssText = "margin-right:6px;";
          if (field.required && field.type === "single_choice" && optIdx === 0) radio.required = true;
          if (prev) {
            if (field.type === "single_choice" && prev === String(opt)) radio.checked = true;
            else if (field.type === "multi_choice" && Array.isArray(prev) && prev.indexOf(String(opt)) !== -1) radio.checked = true;
          }
          optLabel.appendChild(radio);
          optLabel.appendChild(document.createTextNode(String(opt)));
          wrap.appendChild(optLabel);
          inputs.push(radio);
        });
        currentPageRefs[field.id] = { kind: "choice", els: inputs, config: field };
      }
      return wrap;
    }

    function captureCurrentPageValues() {
      Object.keys(currentPageRefs).forEach(function (fieldId) {
        var ref = currentPageRefs[fieldId];
        if (ref.kind === "input") {
          accumulatedValues[fieldId] = ref.el.value ? String(ref.el.value).trim() : "";
        } else if (ref.kind === "choice") {
          if (ref.config.type === "single_choice") {
            var picked = ref.els.filter(function (r) { return r.checked; });
            accumulatedValues[fieldId] = picked.length ? picked[0].value : "";
          } else {
            accumulatedValues[fieldId] = ref.els.filter(function (r) { return r.checked; }).map(function (r) { return r.value; });
          }
        }
        fieldConfigsById[fieldId] = ref.config;
      });
    }

    function chapterIsValidEmail(v) { return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(String(v)); }
    function chapterIsValidPhone(v) { var d = String(v).replace(/[^0-9]/g, ""); return d.length >= 7 && d.length <= 15; }
    function chapterIsValidNumber(v) { return /^-?\\d*\\.?\\d+$/.test(String(v).trim()); }

    function validateCurrentPage() {
      var ok = true;
      Object.keys(currentPageRefs).forEach(function (fieldId) {
        if (!ok) return;
        var ref = currentPageRefs[fieldId];
        var cfg = ref.config;
        var label = cfg.label || cfg.id;
        var val;
        if (ref.kind === "input") val = ref.el.value ? String(ref.el.value).trim() : "";
        else if (ref.kind === "choice") {
          if (cfg.type === "single_choice") {
            var picked = ref.els.filter(function (r) { return r.checked; });
            val = picked.length ? picked[0].value : "";
          } else {
            val = ref.els.filter(function (r) { return r.checked; }).map(function (r) { return r.value; });
          }
        }
        var isEmpty = (ref.kind === "input" && !val) ||
          (ref.kind === "choice" && cfg.type === "single_choice" && !val) ||
          (ref.kind === "choice" && cfg.type === "multi_choice" && (!val || val.length === 0));
        if (cfg.required && isEmpty) {
          showError("Please fill in: " + label);
          ok = false;
          return;
        }
        // Format checks apply to any filled input field (required or not).
        if (ref.kind === "input" && val) {
          if (cfg.type === "email" && !chapterIsValidEmail(val)) {
            showError("Please enter a valid email for \\u201C" + label + "\\u201D.");
            ok = false;
          } else if (cfg.type === "phone" && !chapterIsValidPhone(val)) {
            showError("Please enter a valid phone number for \\u201C" + label + "\\u201D.");
            ok = false;
          } else if (cfg.type === "number" && !chapterIsValidNumber(val)) {
            showError("\\u201C" + label + "\\u201D must be a number.");
            ok = false;
          }
        }
      });
      return ok;
    }

    function renderPage(idx) {
      currentPageIdx = idx;
      currentPageRefs = {};
      errorEl.style.display = "none";
      while (contentArea.firstChild) contentArea.removeChild(contentArea.firstChild);
      while (navWrap.firstChild) navWrap.removeChild(navWrap.firstChild);

      var isMultiPage = pages.length > 1;
      var isLast = idx === pages.length - 1;
      var isFirst = idx === 0;
      var page = pages[idx];

      // Progress dots (multi-page only)
      if (isMultiPage && progressIndicator) {
        var dots = document.createElement("div");
        dots.style.cssText = "display:flex;gap:6px;justify-content:center;margin-bottom:12px;";
        pages.forEach(function (_, dotIdx) {
          var dot = document.createElement("span");
          dot.style.cssText = "width:8px;height:8px;border-radius:50%;display:inline-block;" +
            "background:" + (dotIdx === idx ? "#E36410" : (dotIdx < idx ? "#FED7AA" : "#E5E7EB")) + ";";
          dots.appendChild(dot);
        });
        contentArea.appendChild(dots);
      }

      // Content blocks
      (page.content_blocks || []).forEach(function (block) {
        var el = buildContentBlock(block);
        if (el) contentArea.appendChild(el);
      });

      // Form fields
      (page.form_fields || []).forEach(function (field) {
        if (!field || !field.id || !field.type) return;
        var fieldEl = buildFormField(field);
        if (fieldEl) contentArea.appendChild(fieldEl);
      });

      // Nav buttons
      if (isMultiPage && !isFirst && backButton) {
        var backBtn = document.createElement("button");
        backBtn.type = "button";
        backBtn.className = "chapter-prompt-button";
        backBtn.style.cssText = "background:#9CA3AF;flex:1;";
        backBtn.textContent = "Back";
        backBtn.addEventListener("click", function () {
          captureCurrentPageValues();  // preserve current entries even when navigating back
          renderPage(idx - 1);
        });
        navWrap.appendChild(backBtn);
      }

      var primaryBtn = document.createElement("button");
      primaryBtn.type = "submit";
      primaryBtn.className = "chapter-prompt-button";
      primaryBtn.style.cssText = "flex:1;";
      primaryBtn.textContent = isLast ? "Submit" : "Next";
      navWrap.appendChild(primaryBtn);
    }

    renderPage(0);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      errorEl.style.display = "none";

      if (!validateCurrentPage()) return;
      captureCurrentPageValues();

      var isLast = currentPageIdx === pages.length - 1;
      if (!isLast) {
        // Phase 2B.1 — apply branching rules. First matching rule wins.
        // Rule fires when its from_page_id matches the current page AND
        // accumulatedValues[field_id] equals the rule's value (string-coerced).
        var currentPageId = pages[currentPageIdx].id;
        var jumpToIdx = -1;
        for (var ri = 0; ri < branchingRules.length; ri++) {
          var rule = branchingRules[ri];
          if (!rule || rule.from_page_id !== currentPageId) continue;
          if (!rule.field_id) continue;
          var actual = accumulatedValues[rule.field_id];
          var actualStr = Array.isArray(actual) ? actual.join(",") : (actual == null ? "" : String(actual));
          if (rule.operator === "equals" && actualStr === String(rule.value || "")) {
            // Find target page idx by id
            for (var pi = 0; pi < pages.length; pi++) {
              if (pages[pi].id === rule.to_page_id) { jumpToIdx = pi; break; }
            }
            if (jumpToIdx !== -1) break;  // First matching rule wins
          }
        }
        // Fallback: sequential next if no rule matched OR to_page is invalid
        renderPage(jumpToIdx !== -1 ? jumpToIdx : currentPageIdx + 1);
        return;
      }

      // Final submit — process accumulated values across all pages.
      var primaryBtn = navWrap.querySelector('button[type="submit"]');
      if (primaryBtn) { primaryBtn.disabled = true; primaryBtn.textContent = "Submitting…"; }

      var identityTasks = [];
      var responses = {};

      Object.keys(accumulatedValues).forEach(function (fieldId) {
        var cfg = fieldConfigsById[fieldId];
        var val = accumulatedValues[fieldId];
        if (cfg && cfg.for_identity && val) {
          if (cfg.type === "email" && chapterValidEmail(val)) {
            identityTasks.push(
              chapterHashEmail(val).then(function (h) {
                if (h) {
                  api.identify({
                    identity_key: "email_sha256:" + h,
                    traits: { source: "identity_prompt", prompt_slug: prompt.slug },
                  });
                  return "email_sha256:" + h;
                }
                return null;
              })
            );
          } else if (cfg.type === "phone") {
            identityTasks.push(
              chapterHashPhone(val).then(function (h) {
                if (h) {
                  api.identify({
                    identity_key: "phone_sha256:" + h,
                    traits: { source: "identity_prompt", prompt_slug: prompt.slug },
                  });
                  return "phone_sha256:" + h;
                }
                return null;
              })
            );
          }
        } else {
          responses[fieldId] = val;
        }
      });

      Promise.all(identityTasks).then(function (identityKeys) {
        var identityKey = null;
        for (var i = 0; i < identityKeys.length; i++) {
          if (identityKeys[i] && identityKeys[i].indexOf("email_sha256:") === 0) {
            identityKey = identityKeys[i];
            break;
          }
        }
        if (!identityKey) {
          for (var j = 0; j < identityKeys.length; j++) {
            if (identityKeys[j]) { identityKey = identityKeys[j]; break; }
          }
        }

        api.track("identity_prompt_submitted", {
          prompt_slug: prompt.slug,
          preset_type: prompt.preset_type,
        });

        chapterPostPromptResponse({
          prompt_id: prompt.id,
          prompt_slug: prompt.slug,
          responses: responses,
          identity_key: identityKey,
          hp_field: honeypotInput.value || "",
        });

        // Success state
        while (card.firstChild) card.removeChild(card.firstChild);
        card.appendChild(closeBtn);
        var successMsg = document.createElement("p");
        successMsg.className = "chapter-prompt-success-msg";
        successMsg.textContent = prompt.success_message || "Thanks!";
        card.appendChild(successMsg);
      });
    });
  }

  function chapterPostPromptResponse(payload) {
    var apiOrigin = getApiOrigin() || "https://ads4good.com";
    var url = apiOrigin + "/api/chapter/prompt-response";
    try {
      fetch(url, {
        method: "POST",
        credentials: "omit",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({
          client_key: clientKey,
          prompt_id: payload.prompt_id,
          prompt_slug: payload.prompt_slug,
          responses: payload.responses,
          identity_key: payload.identity_key,
          anonymous_id: typeof cachedAnonId !== "undefined" ? cachedAnonId : null,
          journey_id: typeof cachedJourneyId !== "undefined" ? cachedJourneyId : null,
          page_url: window.location.href,
          session_token: chapterPromptSessionToken,
          hp_field: payload.hp_field,
        }),
      }).catch(function () { /* fire-and-forget */ });
    } catch (e) { /* noop */ }
  }

  // MI v2 Phase 5 — Make an Offer renderer.
  //
  // Modal with product summary + bid input + email input. Submit POSTs to
  // /api/chapter/offer-submit and swaps to a decision-appropriate success
  // state (auto_accept → show code, counter → show counter number, review →
  // "we'll be in touch"). Honeypot + session_token same defense pattern as
  // /api/chapter/prompt-response.
  function chapterRenderPromptMakeAnOffer(prompt) {
    chapterInjectPromptStyles();
    var target = (prompt.container_jsonb && prompt.container_jsonb.target) || null;
    var contentBlocks = Array.isArray(prompt.content_blocks_jsonb) ? prompt.content_blocks_jsonb : [];

    var backdrop = document.createElement("div");
    backdrop.className = "chapter-prompt-backdrop";
    var card = document.createElement("div");
    card.className = "chapter-prompt-card";

    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "chapter-prompt-close";
    closeBtn.textContent = "×";
    closeBtn.setAttribute("aria-label", "Close");
    card.appendChild(closeBtn);

    function dismiss(method) {
      try { backdrop.remove(); } catch (e) { /* noop */ }
      api.track("identity_prompt_dismissed", {
        prompt_slug: prompt.slug,
        preset_type: prompt.preset_type,
        dismiss_method: method,
      });
    }
    closeBtn.addEventListener("click", function () { dismiss("close_button"); });
    backdrop.addEventListener("click", function (e) { if (e.target === backdrop) dismiss("backdrop"); });

    for (var i = 0; i < contentBlocks.length; i++) {
      var block = contentBlocks[i] || {};
      if (block.type === "headline") {
        var h = document.createElement("h3");
        h.className = "chapter-prompt-headline";
        h.textContent = String(block.text || "Name your price");
        card.appendChild(h);
      } else if (block.type === "body") {
        var p = document.createElement("p");
        p.className = "chapter-prompt-body";
        p.textContent = String(block.text || "");
        card.appendChild(p);
      }
    }

    if (target && target.product_name) {
      var meta = document.createElement("div");
      meta.className = "chapter-prompt-body";
      var listPriceText = target.list_price != null ? " (list $" + Number(target.list_price).toFixed(2) + ")" : "";
      meta.textContent = "For: " + target.product_name + listPriceText;
      card.appendChild(meta);
    }

    var form = document.createElement("form");
    form.style.display = "grid";
    form.style.gap = "10px";
    form.style.marginTop = "12px";

    var bidInput = document.createElement("input");
    bidInput.type = "number";
    bidInput.name = "bid_amount";
    bidInput.min = "0.01";
    bidInput.step = "0.01";
    bidInput.required = true;
    bidInput.placeholder = "Your offer ($)";
    bidInput.className = "chapter-prompt-input";
    form.appendChild(bidInput);

    var emailInput = document.createElement("input");
    emailInput.type = "email";
    emailInput.name = "email";
    emailInput.required = true;
    emailInput.placeholder = "you@example.com";
    emailInput.className = "chapter-prompt-input";
    form.appendChild(emailInput);

    var honeypotInput = document.createElement("input");
    honeypotInput.type = "text";
    honeypotInput.name = "hp_field";
    honeypotInput.tabIndex = -1;
    honeypotInput.setAttribute("aria-hidden", "true");
    honeypotInput.style.cssText = "position:absolute;left:-9999px;width:1px;height:1px;opacity:0";
    form.appendChild(honeypotInput);

    var submitBtn = document.createElement("button");
    submitBtn.type = "submit";
    submitBtn.className = "chapter-prompt-submit";
    submitBtn.textContent = prompt.button_label || "Send offer";
    form.appendChild(submitBtn);

    var errBox = document.createElement("div");
    errBox.style.color = "#B04A00";
    errBox.style.fontSize = "13px";
    errBox.style.display = "none";
    form.appendChild(errBox);

    card.appendChild(form);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      errBox.style.display = "none";
      var bid = parseFloat(bidInput.value);
      var email = String(emailInput.value || "").trim().toLowerCase();
      if (!isFinite(bid) || bid <= 0) {
        errBox.textContent = "Please enter a valid offer amount.";
        errBox.style.display = "block";
        return;
      }
      if (!email || email.indexOf("@") < 0) {
        errBox.textContent = "Please enter a valid email.";
        errBox.style.display = "block";
        return;
      }
      submitBtn.disabled = true;
      submitBtn.textContent = "Sending…";

      chapterHashEmail(email).then(function (hash) {
        var identityKey = "email_sha256:" + hash;
        // Identify first so downstream event stitches immediately.
        try { api.identify(identityKey, {}, {}); } catch (e2) { /* noop */ }

        chapterPostOfferSubmit({
          prompt_id: prompt.id,
          identity_key: identityKey,
          recipient_email: email,
          bid_amount: bid,
          target: target || { type: "storewide" },
          hp_field: honeypotInput.value || "",
        }).then(function (result) {
          submitBtn.disabled = false;
          if (!result || result.error) {
            errBox.textContent = "Something went wrong. Please try again.";
            errBox.style.display = "block";
            submitBtn.textContent = prompt.button_label || "Send offer";
            return;
          }
          api.track("identity_prompt_submitted", {
            prompt_slug: prompt.slug,
            preset_type: prompt.preset_type,
            decision: result.decision,
            bid_amount: bid,
          });
          // Swap card contents to the decision-appropriate success state.
          form.style.display = "none";
          var successBox = document.createElement("div");
          successBox.className = "chapter-prompt-body";
          if (result.decision === "auto_accept") {
            successBox.innerHTML = "<strong>Offer accepted.</strong> We just emailed your code.";
          } else if (result.decision === "counter" && result.counter_amount != null) {
            successBox.innerHTML = "<strong>Counter-offer sent.</strong> We countered at $" +
              Number(result.counter_amount).toFixed(2) + ". Check your inbox to accept.";
          } else if (result.decision === "decline") {
            successBox.innerHTML = "Thanks for your offer — unfortunately we can't go that low right now.";
          } else {
            successBox.innerHTML = "Thanks! We'll review your offer and follow up.";
          }
          card.appendChild(successBox);
        }).catch(function () {
          submitBtn.disabled = false;
          errBox.textContent = "Network error. Please try again.";
          errBox.style.display = "block";
          submitBtn.textContent = prompt.button_label || "Send offer";
        });
      });
    });

    backdrop.appendChild(card);
    document.body.appendChild(backdrop);
    api.track("identity_prompt_shown", { prompt_slug: prompt.slug, preset_type: prompt.preset_type, container: "modal" });
  }

  function chapterPostOfferSubmit(payload) {
    var apiOrigin = getApiOrigin() || "https://ads4good.com";
    var url = apiOrigin + "/api/chapter/offer-submit";
    return fetch(url, {
      method: "POST",
      credentials: "omit",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_key: clientKey,
        prompt_id: payload.prompt_id,
        session_token: chapterPromptSessionToken,
        hp_field: payload.hp_field,
        bid_amount: payload.bid_amount,
        target: payload.target,
        identity_key: payload.identity_key,
        recipient_email: payload.recipient_email,
        page_url: window.location.href,
      }),
    })
      .then(function (res) { return res.json().catch(function () { return { error: "invalid_json" }; }); })
      .catch(function (e) { return { error: String(e) }; });
  }

  function chapterRenderPromptV1(prompt) {
    chapterInjectPromptStyles();
    var inputMode = prompt.input_mode || "email";
    var postAction = prompt.post_submit_action || "message";

    var backdrop = document.createElement("div");
    backdrop.className = "chapter-prompt-backdrop";
    var card = document.createElement("div");
    card.className = "chapter-prompt-card";

    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "chapter-prompt-close";
    closeBtn.textContent = "×";
    closeBtn.setAttribute("aria-label", "Close");

    var headline = document.createElement("h3");
    headline.className = "chapter-prompt-headline";
    headline.textContent = prompt.headline || "";

    var body = document.createElement("p");
    body.className = "chapter-prompt-body";
    body.textContent = prompt.body || "";

    var emailInput = null, phoneInput = null;
    if (inputMode === "email" || inputMode === "either") {
      if (inputMode === "either") {
        var emailLabel = document.createElement("label");
        emailLabel.className = "chapter-prompt-field-label";
        emailLabel.textContent = "Email";
        var emailWrap = document.createElement("div");
        emailWrap.appendChild(emailLabel);
        emailInput = document.createElement("input");
        emailInput.type = "email";
        emailInput.className = "chapter-prompt-input";
        emailInput.placeholder = prompt.email_placeholder || "you@email.com";
        emailInput.autocomplete = "email";
        emailWrap.appendChild(emailInput);
      } else {
        emailInput = document.createElement("input");
        emailInput.type = "email";
        emailInput.className = "chapter-prompt-input";
        emailInput.placeholder = prompt.email_placeholder || "you@email.com";
        emailInput.autocomplete = "email";
      }
    }
    if (inputMode === "phone" || inputMode === "either") {
      if (inputMode === "either") {
        var phoneLabel = document.createElement("label");
        phoneLabel.className = "chapter-prompt-field-label";
        phoneLabel.textContent = "Phone";
        var phoneWrap = document.createElement("div");
        phoneWrap.appendChild(phoneLabel);
        phoneInput = document.createElement("input");
        phoneInput.type = "tel";
        phoneInput.className = "chapter-prompt-input";
        phoneInput.placeholder = prompt.phone_placeholder || "(555) 555-5555";
        phoneInput.autocomplete = "tel";
        phoneWrap.appendChild(phoneInput);
      } else {
        phoneInput = document.createElement("input");
        phoneInput.type = "tel";
        phoneInput.className = "chapter-prompt-input";
        phoneInput.placeholder = prompt.phone_placeholder || "(555) 555-5555";
        phoneInput.autocomplete = "tel";
      }
    }

    var errorEl = document.createElement("p");
    errorEl.className = "chapter-prompt-error";
    errorEl.style.display = "none";

    // Honeypot: invisible input that bots commonly fill. Hidden from real
    // humans via position + size + aria. If it arrives non-empty in the
    // email-send POST, the server rejects.
    var honeypotInput = document.createElement("input");
    honeypotInput.type = "text";
    honeypotInput.name = "hp_field";
    honeypotInput.tabIndex = -1;
    honeypotInput.autocomplete = "off";
    honeypotInput.setAttribute("aria-hidden", "true");
    honeypotInput.style.cssText =
      "position:absolute;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;";

    var button = document.createElement("button");
    button.type = "submit";
    button.className = "chapter-prompt-button";
    button.textContent = prompt.button_label || "Submit";

    var form = document.createElement("form");
    form.appendChild(headline);
    if (prompt.body) form.appendChild(body);
    if (inputMode === "either") {
      if (emailWrap) form.appendChild(emailWrap);
      if (phoneWrap) form.appendChild(phoneWrap);
    } else {
      if (emailInput) form.appendChild(emailInput);
      if (phoneInput) form.appendChild(phoneInput);
    }
    form.appendChild(honeypotInput);
    form.appendChild(errorEl);
    form.appendChild(button);

    card.appendChild(closeBtn);
    card.appendChild(form);
    backdrop.appendChild(card);
    document.body.appendChild(backdrop);

    chapterRecordPromptShown(prompt);
    api.track("identity_prompt_shown", { prompt_slug: prompt.slug });

    function dismiss(method) {
      if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
      api.track("identity_prompt_dismissed", { prompt_slug: prompt.slug, dismiss_method: method });
    }

    closeBtn.addEventListener("click", function () { dismiss("close_button"); });
    backdrop.addEventListener("click", function (e) { if (e.target === backdrop) dismiss("backdrop_click"); });

    function showError(msg) {
      errorEl.textContent = msg;
      errorEl.style.display = "block";
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var emailVal = emailInput ? emailInput.value.trim() : "";
      var phoneVal = phoneInput ? phoneInput.value.trim() : "";

      var hasEmail = emailVal && chapterValidEmail(emailVal);
      var hasPhone = phoneVal && chapterNormalizePhone(phoneVal);

      if (inputMode === "email" && !hasEmail) return showError("Please enter a valid email.");
      if (inputMode === "phone" && !hasPhone) return showError("Please enter a valid phone number.");
      if (inputMode === "either" && !hasEmail && !hasPhone) {
        return showError("Please enter an email or phone number.");
      }
      if (inputMode === "either" && emailVal && !hasEmail) return showError("That email doesn't look right.");
      if (inputMode === "either" && phoneVal && !hasPhone) return showError("That phone number doesn't look right.");

      // Email-send post-actions require an email address.
      if ((postAction === "email" || postAction === "email_message") && !hasEmail) {
        return showError("This prompt sends an email — please enter a valid email address.");
      }

      errorEl.style.display = "none";
      button.disabled = true;
      button.textContent = "Submitting…";

      var hashTasks = [];
      if (hasEmail) hashTasks.push(chapterHashEmail(emailVal).then(function (h) { return { type: "email", hash: h }; }));
      if (hasPhone) hashTasks.push(chapterHashPhone(phoneVal).then(function (h) { return { type: "phone", hash: h }; }));

      Promise.all(hashTasks).then(function (results) {
        // Identity stitch: email_sha256 preferred (more stable cross-platform).
        // Phone identity also fires when present so /api/purchase Phase 3.5 can
        // alias them later.
        results.forEach(function (r) {
          if (!r.hash) return;
          var key = r.type === "email" ? "email_sha256:" + r.hash : "phone_sha256:" + r.hash;
          api.identify({
            identity_key: key,
            traits: { source: "identity_prompt", prompt_slug: prompt.slug }
          });
        });
        api.track("identity_prompt_submitted", { prompt_slug: prompt.slug });

        // Dispatch post-submit action.
        if (postAction === "redirect") {
          var url = prompt.post_submit_url;
          if (url) {
            window.location.href = url;
            return;
          }
        }

        if ((postAction === "email" || postAction === "email_message") && hasEmail) {
          chapterSendPromptEmail(prompt.slug, emailVal, honeypotInput.value || "");
          // Fall through to success state so user sees confirmation.
        }

        renderSuccessState(prompt, postAction);
      });
    });

    function renderSuccessState(prompt, action) {
      while (card.firstChild) card.removeChild(card.firstChild);
      card.appendChild(closeBtn);

      var successMsg = document.createElement("p");
      successMsg.className = "chapter-prompt-success-msg";
      successMsg.textContent = prompt.success_message || "Thanks!";
      card.appendChild(successMsg);

      // 'button' action: show CTA linking to the configured URL.
      if (action === "button" && prompt.post_submit_url) {
        var linkBtn = document.createElement("a");
        linkBtn.href = prompt.post_submit_url;
        linkBtn.className = "chapter-prompt-link-btn";
        linkBtn.textContent = prompt.post_submit_button_label || "Claim it";
        // Honor target=_self by default so it replaces the current page.
        card.appendChild(linkBtn);
        return;
      }

      // 'email_message' action: just the success message, no offer box
      // (operator's email content stands alone).
      if (action === "email_message") return;

      // 'message' action (or fallback): show the offer in the modal.
      // 'email' action: also show the offer here as confirmation of what was sent.
      if (prompt.offer_code) {
        var offer = document.createElement("div");
        offer.className = "chapter-prompt-offer";
        var code = document.createElement("div");
        code.className = "chapter-prompt-offer-code";
        code.textContent = prompt.offer_code;
        offer.appendChild(code);
        if (prompt.offer_description) {
          var desc = document.createElement("div");
          desc.className = "chapter-prompt-offer-desc";
          desc.textContent = prompt.offer_description;
          offer.appendChild(desc);
        }
        card.appendChild(offer);
      }
    }
  }

  function chapterSendPromptEmail(slug, recipient, hpField) {
    var apiOrigin = getApiOrigin() || "https://ads4good.com";
    var url = new URL("/api/chapter/identity-prompt-email", apiOrigin);
    try {
      fetch(url.toString(), {
        method: "POST",
        credentials: "omit",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_key: clientKey,
          prompt_slug: slug,
          recipient: recipient,
          session_token: chapterPromptSessionToken,
          hp_field: hpField,
        }),
      }).catch(function () { /* fire-and-forget */ });
    } catch (e) { /* noop */ }
  }

  function chapterRegisterClickElementTrigger(prompt) {
    var selector = prompt.trigger_jsonb && prompt.trigger_jsonb.selector;
    if (!selector) return;
    document.addEventListener("click", function (e) {
      if (chapterIsPromptThrottled(prompt)) return;
      var hit = e.target.closest(selector);
      if (!hit) return;
      e.preventDefault();
      chapterRenderPrompt(prompt);
    });
  }

  function chapterRegisterExitIntentTrigger(prompt) {
    document.addEventListener("mouseout", function (e) {
      if (chapterIsPromptThrottled(prompt)) return;
      if (e.relatedTarget) return; // mouse moved to another element, not out of viewport
      if (e.clientY > 0) return;   // exit was sideways/below, not top
      chapterRenderPrompt(prompt);
    });
  }

  function chapterRegisterTimeOnPageTrigger(prompt) {
    var delay = (prompt.trigger_jsonb && prompt.trigger_jsonb.delay_ms) || 15000;
    setTimeout(function () {
      if (chapterIsPromptThrottled(prompt)) return;
      chapterRenderPrompt(prompt);
    }, delay);
  }

  function chapterRegisterScrollDepthTrigger(prompt) {
    var threshold = (prompt.trigger_jsonb && prompt.trigger_jsonb.percent) || 50;
    var fired = false;
    window.addEventListener("scroll", function () {
      if (fired) return;
      if (chapterIsPromptThrottled(prompt)) return;
      var pct = getScrollPercent();
      if (pct >= threshold) {
        fired = true;
        chapterRenderPrompt(prompt);
      }
    }, { passive: true });
  }

  // Session token from the prompts GET response. Required by the email-send
  // endpoint as proof that this visitor's browser actually loaded the config
  // (defense against direct-POST attackers).
  var chapterPromptSessionToken = "";

  function chapterLoadIdentityPrompts() {
    if (!clientKey) return;
    // Derive origin from script src so 1P installs hit the client's own
    // subdomain (chapter.<client>.com) instead of ads4good.com (which would
    // CORS-reject any cross-origin call from the client storefront).
    var apiOrigin = getApiOrigin() || "https://ads4good.com";
    var url = new URL("/api/chapter/identity-prompts", apiOrigin);
    url.searchParams.set("client_key", clientKey);
    fetch(url.toString(), { credentials: "omit", cache: "no-store" })
      .then(function (res) { return res.ok ? res.json() : { prompts: [], session_token: "" }; })
      .then(function (data) {
        chapterPromptSessionToken = (data && data.session_token) || "";
        var prompts = (data && data.prompts) || [];
        prompts.forEach(function (prompt) {
          var trig = prompt.trigger_jsonb || {};
          if (trig.type === "click_element") chapterRegisterClickElementTrigger(prompt);
          else if (trig.type === "exit_intent") chapterRegisterExitIntentTrigger(prompt);
          else if (trig.type === "time_on_page") chapterRegisterTimeOnPageTrigger(prompt);
          else if (trig.type === "scroll_depth") chapterRegisterScrollDepthTrigger(prompt);
        });
      })
      .catch(function () {});
  }

  // Chapter element picker — when the dashboard opens the client's site with
  // #__chapter_pick (or picker mode persisted in sessionStorage across a page
  // navigation), load the picker overlay instead of firing prompts. Lets a
  // non-technical owner click the element their prompt should trigger on and
  // sends the CSS selector back to the dashboard tab.
  function chapterInPickMode() {
    try {
      if (/__chapter_pick/.test(location.hash)) return true;
      if (/[?&]__chapter_pick/.test(location.search)) return true;
      return sessionStorage.getItem("__chapter_pick") === "1";
    } catch (e) { return false; }
  }

  if (chapterInPickMode()) {
    try {
      sessionStorage.setItem("__chapter_pick", "1");
      var pks = document.createElement("script");
      pks.src = (getApiOrigin() || "https://ads4good.com") + "/api/chapter/picker.js";
      pks.async = true;
      document.head.appendChild(pks);
    } catch (e) {}
  } else {
    chapterLoadIdentityPrompts();
  }
})();
`.trim();

  return new NextResponse(script, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}