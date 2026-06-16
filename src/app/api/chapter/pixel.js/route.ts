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

  var api = {
    __chapterLoaded: true,
    track: function (eventName, props) {
      send(eventName, props);
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
      ".chapter-prompt-input{width:100%;padding:10px 12px;border:1px solid #E5DDC9;border-radius:8px;font-size:14px;box-sizing:border-box;outline:none;}",
      ".chapter-prompt-input:focus{border-color:#E36410;}",
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

  function chapterRenderPrompt(prompt) {
    chapterInjectPromptStyles();
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

    var input = document.createElement("input");
    input.type = "email";
    input.className = "chapter-prompt-input";
    input.placeholder = "you@email.com";
    input.required = true;
    input.autocomplete = "email";

    var button = document.createElement("button");
    button.type = "submit";
    button.className = "chapter-prompt-button";
    button.textContent = prompt.button_label || "Submit";

    var form = document.createElement("form");
    form.appendChild(headline);
    if (prompt.body) form.appendChild(body);
    form.appendChild(input);
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

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = input.value.trim();
      if (!email) return;
      button.disabled = true;
      button.textContent = "Submitting…";

      chapterHashEmail(email).then(function (hash) {
        if (hash) {
          api.identify({
            identity_key: "email_sha256:" + hash,
            traits: { source: "identity_prompt", prompt_slug: prompt.slug }
          });
        }
        api.track("identity_prompt_submitted", { prompt_slug: prompt.slug });

        // Swap to success state — keeps the modal open so the offer is read.
        while (card.firstChild) card.removeChild(card.firstChild);
        card.appendChild(closeBtn);

        var successMsg = document.createElement("p");
        successMsg.className = "chapter-prompt-success-msg";
        successMsg.textContent = prompt.success_message || "Thanks!";
        card.appendChild(successMsg);

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
      });
    });
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

  function chapterLoadIdentityPrompts() {
    if (!clientKey) return;
    // Derive origin from script src so 1P installs hit the client's own
    // subdomain (chapter.<client>.com) instead of ads4good.com (which would
    // CORS-reject any cross-origin call from the client storefront).
    var apiOrigin = getApiOrigin() || "https://ads4good.com";
    var url = new URL("/api/chapter/identity-prompts", apiOrigin);
    url.searchParams.set("client_key", clientKey);
    fetch(url.toString(), { credentials: "omit", cache: "default" })
      .then(function (res) { return res.ok ? res.json() : { prompts: [] }; })
      .then(function (data) {
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