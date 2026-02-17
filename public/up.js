/* Unified Pixel v1 (standalone)
   - Auto: page_view, click, scroll_depth, form_submit, visibility_change, page_exit
   - API: window.UnifiedPixel.track(event, props)
          window.UnifiedPixel.identify(identity_key, traits)
   - Sends to: /api/pixel (POST JSON)
   - Optional identify endpoint: /api/identify (POST JSON)
*/
(function () {
    if (window.__UP_LOADED__) return;
    window.__UP_LOADED__ = true;
  
    // --- Read config from the script tag that loaded this file
    function getSelfScript() {
      var scripts = document.getElementsByTagName("script");
      for (var i = scripts.length - 1; i >= 0; i--) {
        var s = scripts[i];
        if (s && s.src && s.src.indexOf("/up.js") !== -1) return s;
      }
      return null;
    }
  
    var self = getSelfScript();
  
    function attr(name, fallback) {
      if (!self) return fallback;
      var v = self.getAttribute(name);
      return v == null || v === "" ? fallback : v;
    }
  
    var CLIENT_KEY = attr("data-client-key", "");
    var VERTICAL = attr("data-vertical", null);
    var ENDPOINT = attr("data-endpoint", "/api/pixel");
    var IDENTIFY_ENDPOINT = attr("data-identify-endpoint", "/api/identify");
    var IDENTITY_STORAGE_KEY = attr("data-identity-storage-key", "up_identity_key");
  
    // Scroll thresholds can be configured like: data-scroll="25,50,75,90"
    var SCROLL_THRESHOLDS = (function () {
      var raw = attr("data-scroll", "25,50,75,90");
      return raw
        .split(",")
        .map(function (x) { return parseInt(x.trim(), 10); })
        .filter(function (n) { return Number.isFinite(n) && n > 0 && n <= 100; })
        .sort(function (a, b) { return a - b; });
    })();
  
    // Click capture can be disabled: data-click="false"
    var ENABLE_CLICKS = attr("data-click", "true") !== "false";
    // Form capture can be disabled: data-forms="false"
    var ENABLE_FORMS = attr("data-forms", "true") !== "false";
    // Scroll capture can be disabled: data-scroll-enabled="false"
    var ENABLE_SCROLL = attr("data-scroll-enabled", "true") !== "false";
    // SPA tracking can be disabled: data-spa="false"
    var ENABLE_SPA = attr("data-spa", "true") !== "false";
  
    // If client_key isn’t provided, we still let it run, but it won’t send.
    function canSend() {
      return typeof CLIENT_KEY === "string" && CLIENT_KEY.trim().length > 0;
    }
  
    function nowIso() {
      return new Date().toISOString();
    }
  
    function getIdentityKey() {
      try {
        return window.localStorage.getItem(IDENTITY_STORAGE_KEY);
      } catch (_) {
        return null;
      }
    }
  
    function setIdentityKey(v) {
      try {
        if (!v) return;
        window.localStorage.setItem(IDENTITY_STORAGE_KEY, v);
      } catch (_) {}
    }
  
    function safeReferrer() {
      try {
        return document.referrer || "";
      } catch (_) {
        return "";
      }
    }
  
    function pagePayloadBase() {
      return {
        client_key: CLIENT_KEY,
        vertical: VERTICAL,
        page_url: window.location.href,
        page_path: window.location.pathname,
        referrer: safeReferrer(),
      };
    }
  
    // --- Transport: prefer sendBeacon for unload reliability; fallback to fetch keepalive
    function send(payload) {
      if (!canSend()) return;
  
      // Attach identity if present
      var ik = getIdentityKey();
      if (ik) payload.identity_key = ik;
  
      var body = JSON.stringify(payload);
  
      try {
        if (navigator.sendBeacon) {
          var ok = navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "application/json" }));
          if (ok) return;
        }
      } catch (_) {}
  
      try {
        fetch(ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: body,
          keepalive: true,
          credentials: "include",
        }).catch(function () {});
      } catch (_) {}
    }
  
    // --- Public API + queue support (in case someone calls track before load)
    var q = (window.__UPQ__ = window.__UPQ__ || []);
  
    function track(eventName, props) {
      send({
        event_name: eventName,
        props: props || null,
        ...pagePayloadBase(),
      });
    }
  

    // --- Anonymous identity (auto)
// Stored separately so we can later "upgrade" anon -> stable and keep the alias.
function getOrCreateAnonIdentity() {
    var k = null;
    try { k = localStorage.getItem("up_anon_identity"); } catch (_) {}
    if (k) return k;
  
    var uuid = null;
  
    // Preferred: crypto.randomUUID()
    try {
      if (typeof crypto !== "undefined" && crypto.randomUUID) {
        uuid = crypto.randomUUID();
      }
    } catch (_) {}
  
    // Fallback if randomUUID unavailable
    if (!uuid) {
      uuid =
        String(Date.now()) +
        "_" +
        String(Math.random()).slice(2) +
        "_" +
        String(Math.random()).slice(2);
    }
  
    var anon = "anon_" + uuid;
  
    try { localStorage.setItem("up_anon_identity", anon); } catch (_) {}
    return anon;
  }
  
  function getIdentityKey() {
    try { return localStorage.getItem("up_identity_key"); } catch (_) { return null; }
  }
  
  function setIdentityKey(k) {
    try { localStorage.setItem("up_identity_key", k); } catch (_) {}
  }
  
    // Identify:
    // - stores identity_key in localStorage for future events
    // - calls /api/identify to create identity_links immediately
    function identify(identity_key, traits) {
      if (!identity_key) return;

      var prev = null;
try { prev = localStorage.getItem("up_identity_key"); } catch (_) {}

if (prev === identity_key) return; // don't re-send same identity

try { localStorage.setItem("up_identity_key", identity_key); } catch (_) {}

setIdentityKey(identity_key);
      // best-effort call to identify endpoint (if present)
      try {
        fetch(IDENTIFY_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_key: CLIENT_KEY,
            identity_key: identity_key,
            traits: traits && typeof traits === "object" ? traits : null,
            ...pagePayloadBase(),
          }),
          keepalive: true,
          credentials: "include",
        }).catch(function () {});
      } catch (_) {}
  
      // also log an identify event through the pixel collector (optional but useful)
      track("identify", { traits: traits || null });
    }

    // --- Bootstrap anon identity on first visit (Option 2)
// If no identity_key exists yet, assign anon_* and immediately link to the current journey.
(function bootstrapAnonIdentity() {
    var current = getIdentityKey();
  
    // Only set anon identity if we have nothing yet
    if (!current) {
      var anon = getOrCreateAnonIdentity();
  
      // Create identity link right away (so journeys stitch even pre-login)
      // We pass a small trait so you can see "anonymous" in identity_links if you want.
      identify(anon, { kind: "anonymous" });
    }
  })();
  
  
    // --- Export API (merge-safe)
var existing = window.UnifiedPixel;
if (!existing || typeof existing !== "object") existing = {};

existing.track = track;
existing.identify = identify;

// If something created a queue array, keep it
window.UnifiedPixel = existing;

// Guard: if some script overwrites UnifiedPixel later, re-attach identify/track
try {
    Object.defineProperty(window, "UnifiedPixel", {
      configurable: true,
      get: function () { return existing; },
      set: function (v) {
        if (v && typeof v === "object") {
          v.track = v.track || track;
          v.identify = v.identify || identify;
          existing = v;
        } else {
          existing = { track: track, identify: identify };
        }
      },
    });
  } catch (_) {}
  
  
    // Drain queued calls if any:
    // supports patterns like: __UPQ__.push(["track","event",{...}])
    try {
      for (var i = 0; i < q.length; i++) {
        var item = q[i];
        if (!item || !item.length) continue;
        if (item[0] === "track") track(item[1], item[2] || null);
        if (item[0] === "identify") identify(item[1], item[2] || null);
      }
      q.length = 0;
    } catch (_) {}
  
    // --- Auto events
    var startTs = Date.now();
    var maxScroll = 0;
    var sentScroll = {}; // threshold -> true
  
    function firePageView(reason) {
      track("page_view", {
        reason: reason || "load",
        url: window.location.href,
      });
    }
  
    function computeScrollPct() {
      var doc = document.documentElement;
      var scrollTop = doc.scrollTop || document.body.scrollTop || 0;
      var scrollHeight = (doc.scrollHeight || 0) - (doc.clientHeight || 0);
      var pct = scrollHeight > 0 ? Math.min(100, Math.round((scrollTop / scrollHeight) * 100)) : 0;
      return pct;
    }
  
    function onScroll() {
      var pct = computeScrollPct();
      if (pct > maxScroll) maxScroll = pct;
  
      for (var i = 0; i < SCROLL_THRESHOLDS.length; i++) {
        var t = SCROLL_THRESHOLDS[i];
        if (pct >= t && !sentScroll[t]) {
          sentScroll[t] = true;
          track("scroll_depth", { percent: t });
        }
      }
    }
  
    function closest(el, selector) {
      try {
        if (!el) return null;
        if (el.closest) return el.closest(selector);
      } catch (_) {}
      return null;
    }
  
    function describeClickTarget(target) {
      var a = closest(target, "a");
      var btn = closest(target, "button");
      var el = a || btn || target;
  
      var tag = (el && el.tagName ? el.tagName.toLowerCase() : "unknown");
      var text = "";
      try {
        text = (el.innerText || el.textContent || "").trim().slice(0, 120);
      } catch (_) {}
  
      var href = null;
      try {
        if (a && a.getAttribute) href = a.getAttribute("href");
      } catch (_) {}
  
      var id = null;
      try { id = el.id || null; } catch (_) {}
  
      var cls = null;
      try {
        cls = el.className && typeof el.className === "string"
          ? el.className.split(/\s+/).slice(0, 6).join(" ")
          : null;
      } catch (_) {}
  
      return { tag: tag, text: text || null, href: href || null, id: id || null, class: cls || null };
    }
  
    function onClick(e) {
      if (!ENABLE_CLICKS) return;
      var target = e.target;
      track("click", describeClickTarget(target));
    }
  
    function onSubmit(e) {
      if (!ENABLE_FORMS) return;
      var form = e.target;
      var action = null;
      try { action = form.getAttribute("action"); } catch (_) {}
      var id = null;
      try { id = form.id || null; } catch (_) {}
      track("form_submit", { action: action || null, form_id: id });
    }
  
    function onVisibility() {
      track("visibility_change", {
        state: document.visibilityState,
        elapsed_ms: Date.now() - startTs,
        max_scroll_pct: maxScroll,
      });
    }
  
    function onExit() {
      track("page_exit", {
        elapsed_ms: Date.now() - startTs,
        max_scroll_pct: maxScroll,
      });
    }
  
    // SPA route change detection
    function patchHistory() {
      if (!ENABLE_SPA) return;
  
      var lastUrl = window.location.href;
  
      function check(reason) {
        var cur = window.location.href;
        if (cur !== lastUrl) {
          lastUrl = cur;
          // reset scroll thresholds for new page view
          sentScroll = {};
          maxScroll = 0;
          startTs = Date.now();
          firePageView(reason || "spa");
        }
      }
  
      var _pushState = history.pushState;
      history.pushState = function () {
        _pushState.apply(history, arguments);
        setTimeout(function () { check("pushState"); }, 0);
      };
  
      var _replaceState = history.replaceState;
      history.replaceState = function () {
        _replaceState.apply(history, arguments);
        setTimeout(function () { check("replaceState"); }, 0);
      };
  
      window.addEventListener("popstate", function () {
        setTimeout(function () { check("popstate"); }, 0);
      });
    }
  
    // --- Attach listeners
    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("beforeunload", onExit);
  
    if (ENABLE_SCROLL) {
      window.addEventListener("scroll", onScroll, { passive: true });
      // initial calc
      setTimeout(onScroll, 0);
    }
  
    patchHistory();
  
    // Initial page view
    firePageView("load");
  })();
  