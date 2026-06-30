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
    return (getApiOrigin() || "") + "/api/chapter/collect";
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
  var cachedJourneyId = clientKey ? getOrCreateId(getJourneyStorageKey(clientKey)) : null;
  var cachedAnonId = clientKey ? getOrCreateId(getAnonStorageKey(clientKey)) : null;

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
  journeyId = getOrCreateId(getJourneyStorageKey(clientKey));
  cachedJourneyId = journeyId;
}

if (!anonId) {
  anonId = getOrCreateId(getAnonStorageKey(clientKey));
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
      var pixelAnonId = cachedAnonId || getOrCreateId(getAnonStorageKey(clientKey));
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
    ].join("");
    document.head.appendChild(style);
  }

  // Moment Identity v2 Phase 1B — preset_type dispatch.
  //
  // Existing v1.5 prompts have preset_type='email_exchange' (DB default) and
  // continue rendering through chapterRenderPromptV1 unchanged — zero
  // regression risk. New presets (custom_form, custom_notification,
  // make_an_offer, phone_call, remind_me) will route through
  // chapterRenderPromptComposable as Phase 2+ wires up the composable renderer.
  function chapterRenderPrompt(prompt) {
    var presetType = prompt.preset_type || "email_exchange";
    if (presetType === "email_exchange") {
      return chapterRenderPromptV1(prompt);
    }
    return chapterRenderPromptComposable(prompt);
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
    if (pagesConfig && pagesConfig.pages.length > 0) {
      pages = pagesConfig.pages;
      progressIndicator = !!pagesConfig.progress_indicator;
      backButton = pagesConfig.back_button !== false;  // default true
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

      if (field.type === "text" || field.type === "email" || field.type === "phone") {
        var inp = document.createElement("input");
        inp.type = field.type === "email" ? "email" : (field.type === "phone" ? "tel" : "text");
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

    function validateCurrentPage() {
      var ok = true;
      Object.keys(currentPageRefs).forEach(function (fieldId) {
        if (!ok) return;
        var ref = currentPageRefs[fieldId];
        var cfg = ref.config;
        if (!cfg.required) return;
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
        if (isEmpty) {
          showError("Please fill in: " + (cfg.label || cfg.id));
          ok = false;
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
        renderPage(currentPageIdx + 1);
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
        successMsg.textContent = "Thanks!";
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

  chapterLoadIdentityPrompts();
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