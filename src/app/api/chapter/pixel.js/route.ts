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

// eTLD+1 with a leading dot, so a cookie set here on the storefront apex is
// also sent to the chapter.<apex> redirect host (e.g. .notsocavalier.com is
// readable by both notsocavalier.com and chapter.notsocavalier.com). Simple
// last-two-labels heuristic — correct for the single-part TLDs every current
// client uses; returns null for localhost / raw IP (host-only cookie).
function chapterApexCookieDomain() {
  try {
    var h = location.hostname;
    if (!h || h === "localhost" || /^[0-9.]+$/.test(h)) return null;
    var parts = h.split(".");
    if (parts.length <= 2) return "." + h;
    return "." + parts.slice(-2).join(".");
  } catch (e) {
    return null;
  }
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

  var CHAPTER_BUFFER_CAP = 100;
  function pushToBuffer(clientKey, body) {
    try {
      var events = readBuffer(clientKey);
      events.push(body);
      // Cap the buffer so a prolonged outage can't grow it past the localStorage
      // quota (which would make writeBuffer throw and drop everything). Keep the
      // most recent CHAPTER_BUFFER_CAP events; discard the oldest.
      if (events.length > CHAPTER_BUFFER_CAP) {
        events = events.slice(events.length - CHAPTER_BUFFER_CAP);
      }
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

  // Batch sibling of removeFromBuffer: one read-filter-write instead of N, so
  // clearing a 20-event flush doesn't do 20 localStorage round trips.
  function removeManyFromBuffer(clientKey, matchIds) {
    try {
      if (!matchIds || !matchIds.length) return;
      var drop = {};
      for (var k = 0; k < matchIds.length; k++) drop[matchIds[k]] = true;
      var events = readBuffer(clientKey);
      var next = [];
      for (var i = 0; i < events.length; i++) {
        if (!events[i] || !drop[events[i]._buffer_id]) next.push(events[i]);
      }
      writeBuffer(clientKey, next);
    } catch (e) {}
  }

  var clientKey = getClientKey();
  var collectUrl = getCollectUrl();
  var identifyUrl = getIdentifyUrl();
  // Do NOT mint identifiers on init for an opted-out browser (explicit opt_out
  // cookie or GPC). Leaving these null means no localStorage/cookie identifier
  // is written to an opted-out browser; they mint lazily in send() only once
  // collection is allowed. (chapterCollectionBlocked is a hoisted declaration.)
  var __chapterBlocked = clientKey ? chapterCollectionBlocked() : true;
  var cachedJourneyId = (clientKey && !__chapterBlocked) ? getOrCreateIdWithCookieFallback(getJourneyStorageKey(clientKey), "up_journey_" + clientKey) : null;
  var cachedAnonId = (clientKey && !__chapterBlocked) ? getOrCreateIdWithCookieFallback(getAnonStorageKey(clientKey), "up_anon_" + clientKey) : null;

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

    // --- Collect circuit breaker + backoff (outage protection) -------------
    // During a backend outage, stop hammering. After CHAPTER_CB_THRESHOLD
    // consecutive failures the circuit opens for an exponential backoff window
    // (with jitter), persisted in localStorage so a visitor moving across pages
    // shares ONE cooldown instead of every page re-hammering. Events stay
    // buffered while open and replay once a probe succeeds — nothing is lost,
    // the load just backs off so the backend can recover.
    var CHAPTER_CB_OPEN_KEY = "__chapter_cb_open";
    var CHAPTER_CB_STEP_KEY = "__chapter_cb_step";
    var chapterCbFails = 0;
    var CHAPTER_CB_THRESHOLD = 5;
    var CHAPTER_CB_BASE_MS = 30000;
    var CHAPTER_CB_MAX_MS = 600000;

    function chapterCircuitOpen() {
      try {
        return parseInt(localStorage.getItem(CHAPTER_CB_OPEN_KEY) || "0", 10) > Date.now();
      } catch (e) { return false; }
    }
    function chapterCircuitTrip() {
      try {
        var step = parseInt(localStorage.getItem(CHAPTER_CB_STEP_KEY) || "0", 10);
        var base = Math.min(CHAPTER_CB_BASE_MS * Math.pow(2, step), CHAPTER_CB_MAX_MS);
        var jitter = Math.floor(Math.random() * (base / 2));
        localStorage.setItem(CHAPTER_CB_OPEN_KEY, String(Date.now() + base + jitter));
        localStorage.setItem(CHAPTER_CB_STEP_KEY, String(step + 1));
      } catch (e) {}
    }
    function chapterCbOnSuccess() {
      chapterCbFails = 0;
      try {
        localStorage.removeItem(CHAPTER_CB_OPEN_KEY);
        localStorage.removeItem(CHAPTER_CB_STEP_KEY);
      } catch (e) {}
    }
    function chapterCbOnFailure() {
      chapterCbFails += 1;
      var tripped = false;
      try { tripped = parseInt(localStorage.getItem(CHAPTER_CB_STEP_KEY) || "0", 10) > 0; } catch (e) {}
      // Fresh degradation needs THRESHOLD failures to open; once opened before
      // (step>0), a single post-cooldown probe failure re-opens immediately with
      // the next, longer backoff so we don't leak THRESHOLD requests per cycle.
      if (chapterCbFails >= CHAPTER_CB_THRESHOLD || tripped) chapterCircuitTrip();
    }

    // Classify a collect response and update buffer + circuit accordingly.
    // Shared by send() and replay so both handle failures identically.
    // Only backend-outage signals (5xx / 429 / network error) trip the circuit;
    // 4xx are permanent client errors — drop the event, don't back off.
    function chapterHandleCollectResult(res, bufferId) {
      if (res && (res.ok || res.status === 204)) {
        removeFromBuffer(clientKey, bufferId);
        chapterCbOnSuccess();
        return;
      }
      var status = res ? res.status : 0; // 0 = network error / no response
      if (status === 429 || status >= 500 || status === 0) {
        // Backend overloaded / down / unreachable — keep buffered, back off.
        chapterCbOnFailure();
      } else if (status >= 400) {
        // Permanent client error (bad payload, auth/CORS/consent reject): a retry
        // will never succeed and this is NOT an outage signal — drop the event
        // and do NOT trip the circuit.
        removeFromBuffer(clientKey, bufferId);
      } else {
        chapterCbOnFailure();
      }
    }

    // --- W1: event batching (per-client, default OFF) ---------------------
    // EOS fires ~8 events per pageview and every one of them upserts the SAME
    // chapter_journey.journeys row. Unbatched, those 8 land in 8 separate
    // transactions that serialise on that row's lock — the single statement
    // measured at 74.5% of all database execution time. Batching collapses them
    // into one journey upsert + one multi-row INSERT.
    //
    // OFF until chapter_config.clients.pixel_batching_enabled flips true for the
    // tenant. The flag arrives on the /api/chapter/identity-prompts response;
    // until it does (or if that fetch fails) every event sends the way it does
    // today, so the failure direction is "behave exactly like yesterday".
    // Seeded from localStorage, not just from the async prompts response.
    //
    // The pixel fires its own page_view during init, BEFORE that fetch can
    // resolve — so without a cached value the first event of every page load
    // escapes batching, and an 8-event pageview costs 2 journey upserts (one
    // lone page_view + one batch) instead of 1. Remembering the last known flag
    // makes every page load after the very first one batch from the first
    // event. Rollback latency is unchanged: the flag is re-read from the server
    // on each page load either way, so flipping the column off takes effect on
    // the next load in both designs.
    var CHAPTER_BATCH_FLAG_KEY = "__chapter_batch_" + clientKey;
    var chapterBatchingEnabled = (function () {
      try { return localStorage.getItem(CHAPTER_BATCH_FLAG_KEY) === "1"; }
      catch (e) { return false; }   // fail safe: OFF
    })();
    var chapterPendingBatch = [];
    var chapterBatchTimer = null;
    var CHAPTER_BATCH_MAX = 20;   // flush early once this many are queued
    var CHAPTER_BATCH_MS = 3000;  // ...or this long after the first queued event

    function chapterQueueEvent(body) {
      chapterPendingBatch.push(body);
      if (chapterPendingBatch.length >= CHAPTER_BATCH_MAX) {
        chapterFlushBatch(false);
        return;
      }
      if (chapterBatchTimer === null) {
        chapterBatchTimer = setTimeout(function () { chapterFlushBatch(false); }, CHAPTER_BATCH_MS);
      }
    }

    // Mirror of chapterHandleCollectResult for a whole flush. Same
    // classification: only 5xx / 429 / network error are outage signals; a 4xx
    // is permanent, so drop rather than retry forever.
    function chapterHandleBatchResult(res, ids) {
      if (res && (res.ok || res.status === 204)) {
        removeManyFromBuffer(clientKey, ids);
        chapterCbOnSuccess();
        return;
      }
      var status = res ? res.status : 0;
      if (status === 429 || status >= 500 || status === 0) {
        chapterCbOnFailure();           // keep buffered; replay will retry
      } else if (status >= 400) {
        removeManyFromBuffer(clientKey, ids);
      } else {
        chapterCbOnFailure();
      }
    }

    function chapterFlushBatch(onUnload) {
      try {
        if (chapterBatchTimer !== null) { clearTimeout(chapterBatchTimer); chapterBatchTimer = null; }
        var batch = chapterPendingBatch;
        chapterPendingBatch = [];
        if (!batch.length) return;
        // Circuit open: events are already durable in the localStorage buffer,
        // so drop them from the in-memory queue and let replay ship them once
        // the cooldown ends. Same contract as send()'s circuit check.
        if (chapterCircuitOpen()) return;

        var ids = [];
        for (var i = 0; i < batch.length; i++) ids.push(batch[i]._buffer_id);

        var envelope = {
          client_key: clientKey,
          journey_id: batch[0].journey_id,
          anonymous_id: batch[0].anonymous_id,
          internal_ignore: batch[0].internal_ignore,
          events: batch
        };
        var payload = JSON.stringify(envelope);

        if (onUnload && navigator && typeof navigator.sendBeacon === "function") {
          // A normal fetch racing page-unload gets cancelled; sendBeacon is the
          // standard built for exactly this and is delivered as the page dies.
          //
          // type is text/plain ON PURPOSE: application/json would make this a
          // non-simple cross-origin request and trigger a CORS preflight, and a
          // preflight is not guaranteed to complete during unload. The server
          // parses the body with req.json(), which does not inspect
          // Content-Type, so the payload is read identically either way.
          var ok = false;
          try {
            ok = navigator.sendBeacon(collectUrl, new Blob([payload], { type: "text/plain" }));
          } catch (e) { ok = false; }
          // sendBeacon's return value is "the UA queued it", not "the server got
          // it" — but it is the only signal available, and it is precise about
          // the failure we can actually act on (payload too large / queue full).
          // Queued => drop from the durable buffer. Refused => leave them there
          // so the next page load replays them. NOT removing on success would
          // mean every single page navigation re-sent its final flush, turning
          // an occasional unload race into systematic double-counting.
          if (ok) removeManyFromBuffer(clientKey, ids);
          return;
        }

        fetch(collectUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          keepalive: true,
          body: payload
        })
          .then(function (res) { chapterHandleBatchResult(res, ids); })
          .catch(function () { chapterHandleBatchResult(null, ids); });
      } catch (e) {}
    }

    function send(eventName, props) {
    // W0c: stamp the event time HERE, at occurrence, not at transmission.
    // This value survives into the localStorage buffer, so a circuit-breaker
    // replay after an outage carries the ORIGINAL time rather than replay time
    // (the latent inaccuracy W0 exists to fix). The server clamps it.
    var eventTs = new Date().toISOString();
    if (!clientKey) return;
    // Opted out (explicit opt_out cookie OR GPC without explicit opt_in): fire
    // nothing AND mint no identifiers. Server also enforces this, but stopping
    // here means we neither send the request nor write a persistent identifier
    // to an opted-out browser.
    if (chapterCollectionBlocked()) return;

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
        event_ts: eventTs,
        internal_ignore: shouldIgnoreChapterTracking(),
        journey_id: journeyId,
        anonymous_id: anonId,
        page_url: window.location.href,
        page_path: window.location.pathname,
        referrer: document.referrer || null,
        props: props || {},
        // Visitor consent state from the chapter_consent cookie
        // (opt_in / opt_out / unknown). The pixel does NOT send consent_mode:
        // the regime applied to an "unknown" status is decided server-side per
        // client (chapter_config.clients.consent_mode). A CMP-aware wrapper that
        // knows the per-visitor decision may pass consent_mode in the payload,
        // and it will win over the server default.
        consent_status: chapterReadConsent()
      };

      pushToBuffer(clientKey, body);

      // Circuit open (backend recently failing): keep the event buffered but do
      // not send. It replays once the circuit closes and a probe succeeds.
      if (chapterCircuitOpen()) return;

      // W1: when batching is on for this tenant, queue instead of sending.
      // pushToBuffer above already made the event durable, so a queued event is
      // no more at risk than a sent-but-unacked one is today.
      if (chapterBatchingEnabled) { chapterQueueEvent(body); return; }

      fetch(collectUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        keepalive: true,
        body: JSON.stringify(body)
      })
        .then(function (res) { chapterHandleCollectResult(res, body._buffer_id); })
        .catch(function () { chapterHandleCollectResult(null, body._buffer_id); });
    } catch (e) {}
  }

    function replayBufferedEvents() {
    try {
      if (!clientKey) return;
      // Consent is re-checked HERE, not just at capture. A buffered event was
      // captured while collection was allowed, but the visitor may have opted
      // out since. An opt-out means stop — so DISCARD the pending events
      // rather than shipping them on the next page load.
      //
      // This check must come BEFORE the circuit-breaker return below: if the
      // circuit is open we bail early, and an opted-out visitor's buffer would
      // otherwise sit in localStorage until the circuit closed.
      //
      // The server is a backstop but not a complete one. /api/pixel treats an
      // opt_out on the journey row as sticky, so a replay is dropped once the
      // opt-out reached the DB — but a consent banner that only writes the
      // chapter_consent cookie without POSTing /api/consent (NSC's bootstrap
      // does exactly this, deliberately, to avoid phantom journeys) never
      // informs the server. The client is the only layer that sees that case.
      if (chapterCollectionBlocked()) {
        writeBuffer(clientKey, []);
        return;
      }
      // Don't replay while backing off — one shared cooldown across pages.
      if (chapterCircuitOpen()) return;

      var events = readBuffer(clientKey);
      if (!events || !events.length) return;

      for (var i = 0; i < events.length; i++) {
        (function (bufferedBody) {
          // W0c: mark this as a REPLAY so the server can tell a legitimately
          // old buffered event apart from a device with a badly wrong clock.
          // Only replays get the generous past window; fresh events get a tight
          // one. Set here (not at buffer time) because an event only becomes a
          // replay by being re-sent.
          bufferedBody._replay = true;
          fetch(collectUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            keepalive: true,
            body: JSON.stringify(bufferedBody)
          })
            .then(function (res) { chapterHandleCollectResult(res, bufferedBody._buffer_id); })
            .catch(function () { chapterHandleCollectResult(null, bufferedBody._buffer_id); });
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

  // Global Privacy Control: navigator.globalPrivacyControl === true is a browser
  // opt-out. Treated as opt_out UNLESS the visitor has an explicit opt_in cookie
  // (which overrides). Re-checked per call, so a later setConsent("opt_in")
  // immediately resumes collection. The server independently enforces the
  // Sec-GPC header on /api/pixel + /api/identify + /r as the backstop.
  function chapterGpcOptOut() {
    try {
      return navigator.globalPrivacyControl === true && chapterReadConsent() !== "opt_in";
    } catch (e) {
      return false;
    }
  }

  // True when the browser has OPTED OUT — an explicit chapter_consent=opt_out
  // cookie, OR a GPC signal without an explicit opt_in. When true the pixel
  // mints NO identifiers (localStorage OR cookie) and sends no events, matching
  // the /r redirect. "unknown" (no signal) is deliberately NOT blocked: the
  // server's per-client consent_mode decides collect-on-unknown. The client
  // only hard-stops on an actual opt-out, so we never write a persistent
  // identifier to a browser that has opted out.
  function chapterCollectionBlocked() {
    try {
      var c = chapterReadConsent();
      if (c === "opt_in") return false;
      if (c === "opt_out") return true;
      return navigator.globalPrivacyControl === true;
    } catch (e) {
      return false;
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
      chapterNotifyTracked(eventName, props);
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

  // Shopify visitor anchor (forward, belt-and-suspenders): Shopify sets a
  // durable first-party _shopify_y cookie (~1yr) that survives even when our
  // anonymous_id is cleared or ITP-capped. Linking it as a stable identity key
  // re-connects a returning visitor's sessions independent of our own cookie
  // durability — the primary cross-visit linker for non-1P Shopify installs and
  // a fallback for 1P ones. Fires once per session (each session's anon links
  // to the same _shopify_y → they merge). No-ops on non-Shopify storefronts
  // (no _shopify_y cookie), so it's self-gating.
  (function chapterCaptureShopifyVisitor() {
    try {
      var y = readCookieValue("_shopify_y");
      if (!y || y.length < 8 || y.length > 64 || !/^[A-Za-z0-9_-]+$/.test(y)) return;
      var flagKey = "__chapter_sy_" + clientKey;
      if (sessionStorage.getItem(flagKey) === "1") return;
      sessionStorage.setItem(flagKey, "1");
      api.identify({ identity_key: "shopify_visitor:" + y, traits: { source: "shopify_visitor" } });
    } catch (e) { /* sessionStorage blocked or no cookie — skip */ }
  })();

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
    if (chid && clientKey && !chapterCollectionBlocked()) {
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

  // Client-side entry-relay CAPTURE (the ITP-proof companion to the redirect's
  // server-set cookie). When a wrapped ad entry bounces through the ad network's
  // own click tracker (e.g. google.com/asnc), Safari's bounce-tracking mitigation
  // purges the chapter_entry cookie the redirect set mid-bounce — so it never
  // reaches the book-now redirect. But auto-tagging still drops the click id on
  // THIS landing URL, first-party. Capture it here — on the page the visitor
  // actually loads, not during a cross-site bounce — and write chapter_entry
  // ourselves, so the book-now redirect's server-side conversion relay can read
  // it. Runs BEFORE the reader below, so this same page_view still gets stamped.
  // Only fires when a known click id is present (no-op for organic traffic and
  // for utm-only wrapped links, whose 60-min redirect cookie is left untouched).
  //
  // TODO (durable upgrade, gated on data — see docs/nsc-gads-server-conversion-
  // runbook.md Phase 4): this document.cookie write is capped at ~7 days on
  // Safari (ITP caps JS-set cookies regardless of the 90-day Max-Age or the
  // A-record). For the full window past 7 days, set chapter_entry SERVER-side
  // via Set-Cookie on the collect endpoint's response (already on the A-record
  // host), or resolve the durable server-set up_anon + DB-lookup the gclid at
  // the book-now redirect. Only build once real bookings show up in the 1–4
  // week post-click window on Safari.
  try {
    if (clientKey) {
      var CHAPTER_CLICK_IDS = [
        ["gclid", "google"], ["gbraid", "google"], ["wbraid", "google"],
        ["fbclid", "meta"], ["ttclid", "tiktok"], ["msclkid", "microsoft"], ["rdt_cid", "reddit"]
      ];
      var landParams = new URLSearchParams(window.location.search);
      var landClick = null;
      for (var ci = 0; ci < CHAPTER_CLICK_IDS.length; ci++) {
        var cidVal = landParams.get(CHAPTER_CLICK_IDS[ci][0]);
        if (cidVal) { landClick = { id: cidVal, platform: CHAPTER_CLICK_IDS[ci][1], kind: CHAPTER_CLICK_IDS[ci][0] }; break; }
      }
      if (landClick && !chapterCollectionBlocked()) {
        var landAnon = cachedAnonId || getOrCreateIdWithCookieFallback(getAnonStorageKey(clientKey), "up_anon_" + clientKey);
        cachedAnonId = landAnon;
        var entryPayload = {
          a: "anonymous_id:" + landAnon,
          j: cachedJourneyId || null,
          t: Math.floor(Date.now() / 1000),
          g: landClick.id,
          gt: landClick.platform,
          gk: landClick.kind
        };
        var landUtm = landParams.get("utm_source");
        if (landUtm) entryPayload.u = landUtm;
        var chapterApex = chapterApexCookieDomain();
        // 90-day life = Google's max click-through window. The book-now redirect
        // dedupes per (client, click id, action), so at most one conversion fires
        // per ad click no matter how many times the visitor returns; and the
        // reader below re-stamps only within its own 1-hour freshness guard on
        // its timestamp, so this long-lived cookie never mislabels a later
        // organic session.
        // encodeURIComponent to match the redirect's Next-set encoding (the
        // pixel reader + book-now readEntryClick both handle that form).
        document.cookie =
          "chapter_entry_" + clientKey + "=" + encodeURIComponent(JSON.stringify(entryPayload)) +
          "; Path=/; Max-Age=" + (60 * 60 * 24 * 90) +
          (chapterApex ? "; Domain=" + chapterApex : "") +
          "; SameSite=Lax" +
          (location.protocol === "https:" ? "; Secure" : "");

        // Paid-entry marker — the SAME click id, written for the prompt gate.
        //
        // /api/pixel sets chapter_paid_entry_<client> durably (Set-Cookie on the
        // A-record collect host) whenever an ingested event carries a click id.
        // But that write only lands once the collect request COMPLETES, and with
        // pixel_batching_enabled the landing page_view sits in the buffer for up
        // to CHAPTER_BATCH_MS (3s) or until pagehide. A cart_hold prompt with
        // delay_on_return_ms: 3000 evaluates its gates at the same instant that
        // flush is still in flight, so chapterHasPaidEntry() fails CLOSED on a
        // visitor who genuinely arrived from an ad. Measured on eos_fabrics:
        // gates read { paid: false } while the cookie appeared moments later.
        //
        // Writing it here removes the round-trip from the critical path — the
        // gate reads a marker that exists before any trigger can fire.
        //
        // ONLY when absent, and that guard is load-bearing: a document.cookie
        // write is ITP-capped at ~7 days on Safari regardless of Max-Age, so
        // overwriting a durable server-set marker would silently downgrade a
        // 90-day cookie to a 7-day one. The server's Set-Cookie on the next
        // collect response replaces ours (same name/domain/path) with the
        // durable form, so this is a bridge to close the race, not a
        // replacement for the server write.
        // TEMPORARY DIAGNOSTIC (chapter_debug=1 only). The gate reads this
        // cookie as ABSENT seconds after this write reports success, on a load
        // where the sibling chapter_entry write demonstrably lands. Logging
        // both sides with performance.now() so the next retest says which half
        // is lying instead of costing another round of hypotheses.
        // chapterDebug() is unusable here: chapterDebugOn is initialised far
        // below this line, so at init it is still undefined and the call no-ops.
        var __paidName = "chapter_paid_entry_" + clientKey;
        var __paidExisting = readCookieValue(__paidName);
        var __paidLog = function () {
          try {
            if (localStorage.getItem("chapter_debug") === "1") {
              console.log.apply(console, ["[chapter] paid_entry@init:"].concat(
                Array.prototype.slice.call(arguments)));
            }
          } catch (e) {}
        };
        __paidLog(
          "name=", __paidName,
          "| existing=", __paidExisting,
          "| apex=", chapterApex,
          "| click=", landClick.kind + "/" + landClick.platform,
          "| at t+", Math.round(performance.now()), "ms"
        );
        if (!__paidExisting) {
          document.cookie =
            __paidName + "=" +
            encodeURIComponent(JSON.stringify({
              k: landClick.kind,
              p: landClick.platform,
              t: Date.now()
            })) +
            "; Path=/; Max-Age=" + (60 * 60 * 24 * 90) +
            (chapterApex ? "; Domain=" + chapterApex : "") +
            "; SameSite=Lax" +
            (location.protocol === "https:" ? "; Secure" : "");
          __paidLog("wrote -> readback=", readCookieValue(__paidName));
        }
      }
    }
  } catch (e) {}

  // Entry-relay handoff (cookie-based, ?chid's ITP/redirect-proof sibling):
  // a wrapped-link entry may have its ?chid stripped by an ad-network
  // intermediary (e.g. google.com/asnc) before reaching this page. The redirect
  // also stashed the same handoff context in a first-party chapter_entry
  // cookie on the apex, which survives that detour. Read it, alias this pixel's
  // anon to the entry identity (idempotent; once per session), and stamp the
  // entry channel onto this page's page_view. We do NOT clear the cookie — the
  // click id inside is reused server-side by the book-now redirect for the
  // Google Ads conversion relay.
  var chapterEntryCtx = null;
  try {
    var entryRaw = readCookieValue("chapter_entry_" + clientKey);
    if (entryRaw && !chapterCollectionBlocked()) {
      var entry = JSON.parse(decodeURIComponent(entryRaw));
      var nowSec = Math.floor(Date.now() / 1000);
      // Freshness guard: ignore a stale cookie left over from an earlier visit.
      if (entry && entry.a && (!entry.t || nowSec - entry.t < 3600)) {
        chapterEntryCtx = entry;
        var entryAnon = cachedAnonId || getOrCreateIdWithCookieFallback(getAnonStorageKey(clientKey), "up_anon_" + clientKey);
        cachedAnonId = entryAnon;
        // Alias entry identity -> this pixel's anon. entry.a is prefixed
        // (anonymous_id:<uuid>); entryAnon is the raw uuid.
        var entryFlag = "__chapter_entry_" + clientKey;
        if (entry.a !== "anonymous_id:" + entryAnon && sessionStorage.getItem(entryFlag) !== "1") {
          sessionStorage.setItem(entryFlag, "1");
          fetch(identifyUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            keepalive: true,
            body: JSON.stringify({
              client_key: clientKey,
              identity_key: entryAnon,
              previous_identity_key: entry.a
            })
          }).catch(function () {});
        }
      }
    }
  } catch (e) {}

  replayBufferedEvents();

  // Flush any queued batch as the page goes away. Both events are registered:
  // pagehide is the reliable desktop unload signal, and visibilitychange ->
  // hidden is the last guaranteed callback on mobile Safari (a backgrounded tab
  // may be killed without ever firing pagehide).
  //
  // Registered HERE, after the pixel's own visibilitychange handler is attached
  // further down, listeners fire in registration order — so the visibility_change
  // event is queued by that handler before this flush collects the queue.
  try {
    window.addEventListener("pagehide", function () { chapterFlushBatch(true); });
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") chapterFlushBatch(true);
    });
  } catch (e) {}

  for (var i = 0; i < queue.length; i++) {
    api.push(queue[i]);
  }

  var pageViewProps = {
    page_title: document.title || null,
    page_type: "site_page"
  };
  // Stamp the landing page_view with the entry channel when this visit arrived
  // via a wrapped link (entry-relay cookie). Lets attribution see the paid /
  // campaign entry even when ?chid was stripped en route.
  if (chapterEntryCtx) {
    pageViewProps.entry_slug = chapterEntryCtx.s || null;
    pageViewProps.entry_click_id = chapterEntryCtx.g || null;
    pageViewProps.entry_click_platform = chapterEntryCtx.gt || null;
    pageViewProps.entry_utm_source = chapterEntryCtx.u || null;
  }
  api.track("page_view", pageViewProps);

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

  // Lifetime show cap. frequency controls shows WITHIN a window (once a session,
  // once per N days); this caps total shows across the visitor's whole life, so
  // "every subsequent visit" can't mean "forever". Survives in localStorage.
  function chapterLifetimeKey(slug) { return "chapter_prompt_shows_" + slug; }
  function chapterPromptLifetimeShows(slug) {
    try { return parseInt(localStorage.getItem(chapterLifetimeKey(slug)) || "0", 10) || 0; }
    catch (e) { return 0; }
  }
  function chapterBumpPromptLifetimeShows(slug) {
    try {
      localStorage.setItem(chapterLifetimeKey(slug),
        String(chapterPromptLifetimeShows(slug) + 1));
    } catch (e) {}
  }

  function chapterIsPromptThrottled(prompt) {
    if (!prompt || !prompt.slug) return false;
    var maxShows = prompt.targeting_jsonb && prompt.targeting_jsonb.max_shows_lifetime;
    if (maxShows && chapterPromptLifetimeShows(prompt.slug) >= Number(maxShows)) return true;
    var freq = prompt.frequency || "session";
    if (freq === "session") return chapterPromptShownThisSession(prompt.slug);
    if (freq === "visitor") return chapterPromptShownForVisitor(prompt.slug, prompt.frequency_days);
    return false; // every_visit
  }
  function chapterRecordPromptShown(prompt) {
    if (!prompt || !prompt.slug) return;
    chapterBumpPromptLifetimeShows(prompt.slug);
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
    if (presetType === "remind_me") return chapterRenderPromptRemindMe(prompt);
    return chapterRenderPromptComposable(prompt);
  }

  // Apply operator-configured button color to CTA buttons. Inline style
  // overrides the CSS class background. Hover state stays the CSS default —
  // acceptable trade-off vs restructuring all button styles to CSS variables.
  // Also applied to link buttons + yes-buttons in yes/no CTAs.
  function chapterApplyThemeButtonColor(el, prompt) {
    if (!el || !prompt || !prompt.theme_button_bg_color) return;
    var color = String(prompt.theme_button_bg_color);
    if (!/^#[0-9a-fA-F]{6}$/.test(color)) return;
    el.style.background = color;
    el.style.borderColor = color;
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
      chapterApplyThemeButtonColor(yesBtn, prompt);
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
      chapterApplyThemeButtonColor(btn, prompt);
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
    api.track("identity_prompt_shown", { prompt_slug: prompt.slug, prompt_updated_at: prompt.updated_at, preset_type: prompt.preset_type, container: "bubble" });
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
    api.track("identity_prompt_shown", { prompt_slug: prompt.slug, prompt_updated_at: prompt.updated_at, preset_type: prompt.preset_type, container: "modal" });
  }

  // Phase 2A/2B — composable renderer for Custom Form preset.
  //
  // Detects multi-page mode from pages_jsonb. Single-page is the trivial
  // case (1 synthetic page from root content_blocks_jsonb + form_fields_jsonb).
  // Multi-page: Back + Next navigation, optional progress dots, accumulated
  // values across pages, identity hashing + POST run once at final Submit.
  //
  // Builds the optional consent element from prompt.consent_jsonb. Returns
  // { el, read(), validate() } or null when off. checkbox = single opt-in box
  // (default unchecked unless configured), choice = explicit Yes/No (must pick).
  function chapterBuildConsent(prompt) {
    var cfg = prompt.consent_jsonb;
    if (!cfg || !cfg.mode || cfg.mode === "off") return null;
    var mode = cfg.mode;
    var text = cfg.text || (mode === "choice" ? "Do you agree?" : "I agree.");
    var wrap = document.createElement("div");
    wrap.style.cssText = "margin:12px 0 2px;font-size:12.5px;color:#3A465A;line-height:1.45;text-align:left;";
    var errEl = document.createElement("div");
    errEl.style.cssText = "color:#B3261E;font-size:11.5px;margin-top:5px;display:none;";

    if (mode === "checkbox") {
      var label = document.createElement("label");
      label.style.cssText = "display:flex;align-items:flex-start;gap:8px;cursor:pointer;";
      var cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = !!cfg.default_checked;
      cb.style.cssText = "margin-top:2px;flex-shrink:0;";
      var span = document.createElement("span");
      span.textContent = text;
      label.appendChild(cb);
      label.appendChild(span);
      wrap.appendChild(label);
      wrap.appendChild(errEl);
      return {
        el: wrap,
        read: function () { return { mode: mode, text: text, value: cb.checked ? "checked" : "unchecked" }; },
        validate: function () {
          if (cfg.required && !cb.checked) { errEl.textContent = "Please check this box to continue."; errEl.style.display = "block"; return false; }
          errEl.style.display = "none"; return true;
        }
      };
    }

    // choice — explicit yes/no, no default, must pick one.
    var q = document.createElement("div");
    q.textContent = text;
    q.style.cssText = "margin-bottom:7px;";
    wrap.appendChild(q);
    var row = document.createElement("div");
    row.style.cssText = "display:flex;gap:18px;";
    var gname = "chapter_consent_" + Math.floor(Math.random() * 1e9);
    function mk(val, lbl) {
      var l = document.createElement("label");
      l.style.cssText = "display:flex;align-items:center;gap:6px;cursor:pointer;";
      var r = document.createElement("input"); r.type = "radio"; r.name = gname; r.value = val;
      var s = document.createElement("span"); s.textContent = lbl;
      l.appendChild(r); l.appendChild(s);
      return { l: l, r: r };
    }
    var yes = mk("yes", "Yes");
    var no = mk("no", "No");
    row.appendChild(yes.l); row.appendChild(no.l);
    wrap.appendChild(row);
    wrap.appendChild(errEl);
    return {
      el: wrap,
      read: function () { return { mode: mode, text: text, value: yes.r.checked ? "yes" : (no.r.checked ? "no" : null) }; },
      validate: function () {
        if (!yes.r.checked && !no.r.checked) { errEl.textContent = "Please choose an option to continue."; errEl.style.display = "block"; return false; }
        errEl.style.display = "none"; return true;
      }
    };
  }

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

    // Optional consent element — shown only on the last page (below).
    var promptConsent = chapterBuildConsent(prompt);
    var consentSlot = document.createElement("div");
    consentSlot.style.display = "none";
    if (promptConsent) consentSlot.appendChild(promptConsent.el);
    form.appendChild(consentSlot);

    var navWrap = document.createElement("div");
    navWrap.style.cssText = "display:flex;gap:8px;align-items:center;margin-top:12px;";
    form.appendChild(navWrap);

    card.appendChild(form);
    backdrop.appendChild(card);
    document.body.appendChild(backdrop);

    chapterRecordPromptShown(prompt);
    api.track("identity_prompt_shown", { prompt_slug: prompt.slug, prompt_updated_at: prompt.updated_at, preset_type: prompt.preset_type });

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

      // Consent element only on the final page (just before submit).
      consentSlot.style.display = (isLast && promptConsent) ? "block" : "none";

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
      chapterApplyThemeButtonColor(primaryBtn, prompt);
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
      if (promptConsent && !promptConsent.validate()) return;
      var primaryBtn = navWrap.querySelector('button[type="submit"]');
      if (primaryBtn) { primaryBtn.disabled = true; primaryBtn.textContent = "Submitting…"; }

      var identityTasks = [];
      var responses = {};
      var rawEmail = "";
      var rawPhone = "";

      Object.keys(accumulatedValues).forEach(function (fieldId) {
        var cfg = fieldConfigsById[fieldId];
        var val = accumulatedValues[fieldId];
        if (cfg && cfg.for_identity && val) {
          if (cfg.type === "email" && chapterValidEmail(val)) {
            rawEmail = val;
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
            rawPhone = val;
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

        // Capture the RAW contact (email/phone) as a lead if one was given.
        if (rawEmail || rawPhone) {
          chapterPostLead({
            prompt_id: prompt.id,
            prompt_slug: prompt.slug,
            email: rawEmail,
            phone: rawPhone,
            identity_key: identityKey,
            responses: responses,
            consent: promptConsent ? promptConsent.read() : null,
            hp_field: honeypotInput.value || "",
          });
        }

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

  // Shared cart snapshot cache — chapterPostLead + chapterSendPromptEmail both
  // fire on Email Exchange submit within milliseconds. Reuse the same /cart.js
  // fetch across both to avoid a duplicate request. 5-second TTL handles the
  // case where multiple submits happen in quick succession.
  var chapterCartSnapshotPromise = null;
  var chapterCartSnapshotAt = 0;
  function chapterFetchCartSnapshot() {
    var now = Date.now();
    if (chapterCartSnapshotPromise && (now - chapterCartSnapshotAt) < 5000) {
      return chapterCartSnapshotPromise;
    }
    chapterCartSnapshotAt = now;
    chapterCartSnapshotPromise = new Promise(function (resolve) {
      var timer = setTimeout(function () { resolve({ token: null, items: null }); }, 800);
      try {
        fetch("/cart.js", { credentials: "same-origin" })
          .then(function (res) { return res.ok ? res.json() : null; })
          .catch(function () { return null; })
          .then(function (cart) {
            clearTimeout(timer);
            if (!cart || typeof cart !== "object") {
              resolve({ token: null, items: null });
              return;
            }
            var token = cart.token ? String(cart.token).split("?")[0] : null;
            var items = Array.isArray(cart.items) && cart.items.length > 0
              ? cart.items.map(function (it) {
                  return {
                    variant_id: it.variant_id != null ? String(it.variant_id) : (it.id != null ? String(it.id) : null),
                    product_title: it.product_title || it.title || "",
                    variant_title: it.variant_title || null,
                    quantity: Number(it.quantity) || 1,
                    line_price_cents: Number(it.line_price) || 0,
                    currency: cart.currency || "USD",
                    url: it.url || null,
                  };
                })
              : null;
            resolve({ token: token, items: items });
          });
      } catch (e) {
        clearTimeout(timer);
        resolve({ token: null, items: null });
      }
    });
    return chapterCartSnapshotPromise;
  }

  // Sends the RAW contact to /api/chapter/lead so the client can use it (Leads
  // view, weekly CSV, later CRM/ESP/webhook). Identity is still hashed
  // separately via /api/identify. Fire-and-forget. consent_* are null until the
  // consent element ships.
  //
  // Now includes cart snapshot (token + line items) at submit time — captured
  // via /cart.js on Shopify, persisted to chapter_engagement.captured_leads
  // so operators can see what visitors abandoned + drive cart-recovery
  // outreach from CRM/ESP integrations later.
  function chapterPostLead(payload) {
    var apiOrigin = getApiOrigin() || "https://ads4good.com";
    chapterFetchCartSnapshot().then(function (cart) {
      try {
        fetch(apiOrigin + "/api/chapter/lead", {
          method: "POST",
          credentials: "omit",
          headers: { "Content-Type": "application/json" },
          keepalive: true,
          body: JSON.stringify({
            client_key: clientKey,
            prompt_id: payload.prompt_id,
            prompt_slug: payload.prompt_slug,
            email: payload.email || "",
            phone: payload.phone || "",
            identity_key: payload.identity_key || null,
            anonymous_id: typeof cachedAnonId !== "undefined" ? cachedAnonId : null,
            journey_id: typeof cachedJourneyId !== "undefined" ? cachedJourneyId : null,
            page_url: window.location.href,
            responses: payload.responses || {},
            consent_mode: payload.consent ? payload.consent.mode : null,
            consent_text: payload.consent ? payload.consent.text : null,
            consent_value: payload.consent ? payload.consent.value : null,
            session_token: chapterPromptSessionToken,
            hp_field: payload.hp_field || "",
            cart_token: (cart && cart.token) || null,
            cart_items: (cart && cart.items) || null,
          }),
        }).catch(function () { /* fire-and-forget */ });
      } catch (e) { /* noop */ }
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
    chapterApplyThemeButtonColor(submitBtn, prompt);
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
    api.track("identity_prompt_shown", { prompt_slug: prompt.slug, prompt_updated_at: prompt.updated_at, preset_type: prompt.preset_type, container: "modal" });
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

  // MI v2 Phase 6b — Remind Me preset renderer. Modal captures email + creates
  // a subscription row (chapter_engagement.subscriptions) via /api/chapter/
  // subscription-create. Notifications fire later from the hourly cron
  // /api/internal/cron/evaluate-subscriptions (Phase 6c) — this renderer only
  // captures intent.
  function chapterRenderPromptRemindMe(prompt) {
    chapterInjectPromptStyles();
    var remindMe = (prompt.container_jsonb && prompt.container_jsonb.remind_me) || {};
    var target = remindMe.target || null;
    var trigger = remindMe.trigger || { type: "back_in_stock" };
    var maxNotifications = remindMe.max_notifications;
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

    // Operator-configured content blocks (headline + body). Falls back to a
    // default headline if none provided so the modal always has anchor text.
    var hasHeadline = false;
    for (var i = 0; i < contentBlocks.length; i++) {
      var block = contentBlocks[i] || {};
      if (block.type === "headline") {
        var h = document.createElement("h3");
        h.className = "chapter-prompt-headline";
        h.textContent = String(block.text || "");
        card.appendChild(h);
        hasHeadline = true;
      } else if (block.type === "body") {
        var p = document.createElement("p");
        p.className = "chapter-prompt-body";
        p.textContent = String(block.text || "");
        card.appendChild(p);
      }
    }
    if (!hasHeadline) {
      var defaultH = document.createElement("h3");
      defaultH.className = "chapter-prompt-headline";
      defaultH.textContent = trigger.type === "price_below"
        ? "Notify me when the price drops"
        : "Notify me when it's back in stock";
      card.appendChild(defaultH);
    }

    // Product summary + trigger clause. Helps the visitor confirm they're
    // subscribing to the right thing before they commit.
    if (target) {
      var meta = document.createElement("div");
      meta.className = "chapter-prompt-body";
      var displayName = target.variant_name
        ? (target.product_name ? target.product_name + " · " + target.variant_name : target.variant_name)
        : (target.product_name || target.product_id || "this item");
      var clause = "";
      if (trigger.type === "back_in_stock") {
        clause = "We'll email you the moment " + displayName + " is back in stock.";
      } else if (trigger.type === "price_below") {
        var thresholdText = trigger.threshold != null ? "$" + Number(trigger.threshold).toFixed(2) : "the target price";
        clause = "We'll email you when " + displayName + " drops below " + thresholdText + ".";
      }
      meta.textContent = clause;
      card.appendChild(meta);
    }

    var form = document.createElement("form");
    form.style.display = "grid";
    form.style.gap = "10px";
    form.style.marginTop = "12px";

    var emailInput = document.createElement("input");
    emailInput.type = "email";
    emailInput.name = "email";
    emailInput.required = true;
    emailInput.placeholder = prompt.email_placeholder || "you@example.com";
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
    chapterApplyThemeButtonColor(submitBtn, prompt);
    submitBtn.textContent = prompt.button_label || "Notify me";
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
      var email = String(emailInput.value || "").trim().toLowerCase();
      if (!email || email.indexOf("@") < 0) {
        errBox.textContent = "Please enter a valid email.";
        errBox.style.display = "block";
        return;
      }
      if (!target) {
        errBox.textContent = "This prompt is missing product config. Contact support.";
        errBox.style.display = "block";
        return;
      }
      submitBtn.disabled = true;
      submitBtn.textContent = "Subscribing…";

      chapterHashEmail(email).then(function (hash) {
        var identityKey = "email_sha256:" + hash;
        try { api.identify(identityKey, {}, {}); } catch (e2) { /* noop */ }

        chapterPostSubscriptionCreate({
          prompt_id: prompt.id,
          identity_key: identityKey,
          recipient_email: email,
          target: target,
          trigger: trigger,
          max_notifications: maxNotifications,
          hp_field: honeypotInput.value || "",
        }).then(function (result) {
          submitBtn.disabled = false;
          if (!result || result.error) {
            errBox.textContent = "Something went wrong. Please try again.";
            errBox.style.display = "block";
            submitBtn.textContent = prompt.button_label || "Notify me";
            return;
          }
          api.track("identity_prompt_submitted", {
            prompt_slug: prompt.slug,
            preset_type: prompt.preset_type,
            subscription_id: result.subscription_id,
            subscription_created: result.created !== false,
          });
          // Success state.
          form.style.display = "none";
          var successBox = document.createElement("div");
          successBox.className = "chapter-prompt-body";
          successBox.style.marginTop = "12px";
          if (result.created === false) {
            successBox.textContent = "You're already on the list — we'll email you when it's time.";
          } else {
            successBox.textContent = prompt.success_message || "You're subscribed — we'll email you the moment it's time.";
          }
          card.appendChild(successBox);
        }).catch(function () {
          submitBtn.disabled = false;
          errBox.textContent = "Network error. Please try again.";
          errBox.style.display = "block";
          submitBtn.textContent = prompt.button_label || "Notify me";
        });
      });
    });

    backdrop.appendChild(card);
    document.body.appendChild(backdrop);
    api.track("identity_prompt_shown", { prompt_slug: prompt.slug, prompt_updated_at: prompt.updated_at, preset_type: prompt.preset_type, container: "modal" });
  }

  function chapterPostSubscriptionCreate(payload) {
    var apiOrigin = getApiOrigin() || "https://ads4good.com";
    var url = apiOrigin + "/api/chapter/subscription-create";
    return fetch(url, {
      method: "POST",
      credentials: "omit",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_key: clientKey,
        prompt_id: payload.prompt_id,
        session_token: chapterPromptSessionToken,
        hp_field: payload.hp_field,
        identity_key: payload.identity_key,
        recipient_email: payload.recipient_email,
        target: payload.target,
        trigger: payload.trigger,
        max_notifications: payload.max_notifications,
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
    chapterApplyThemeButtonColor(button, prompt);
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
    var v1Consent = chapterBuildConsent(prompt);
    if (v1Consent) form.appendChild(v1Consent.el);
    form.appendChild(button);

    card.appendChild(closeBtn);
    card.appendChild(form);
    backdrop.appendChild(card);
    document.body.appendChild(backdrop);

    chapterRecordPromptShown(prompt);
    api.track("identity_prompt_shown", { prompt_slug: prompt.slug, prompt_updated_at: prompt.updated_at });

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

      if (v1Consent && !v1Consent.validate()) return;

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

        // Capture the RAW contact as a lead (identity is still hashed above).
        if (hasEmail || hasPhone) {
          var leadKey = null;
          for (var li = 0; li < results.length; li++) {
            if (results[li] && results[li].hash) {
              var k = results[li].type === "email" ? "email_sha256:" + results[li].hash : "phone_sha256:" + results[li].hash;
              if (results[li].type === "email") { leadKey = k; break; }
              if (!leadKey) leadKey = k;
            }
          }
          chapterPostLead({
            prompt_id: prompt.id,
            prompt_slug: prompt.slug,
            email: hasEmail ? emailVal : "",
            phone: hasPhone ? phoneVal : "",
            identity_key: leadKey,
            consent: v1Consent ? v1Consent.read() : null,
            hp_field: honeypotInput.value || "",
          });
        }

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
        chapterApplyThemeButtonColor(linkBtn, prompt);
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

    // Reuse the shared cart snapshot (same fetch as chapterPostLead so we
    // don't hit /cart.js twice on the same submit). {cart_url} +
    // {cart_items_list} merge tokens resolve server-side.
    chapterFetchCartSnapshot().then(function (cart) {
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
            cart_token: (cart && cart.token) || null,
            cart_items: (cart && cart.items) || null,
          }),
        }).catch(function () { /* fire-and-forget */ });
      } catch (e) { /* noop */ }
    });
  }

  // Page-URL gating (targeting_jsonb.page_match). Checked at FIRE-time (not
  // registration) so SPA navigations honor gating without re-registering.
  // Modes: starts_with / contains / ends_with / exact / not_contains.
  // Empty/missing config = pass (fire on all pages).
  function chapterMatchesPagePattern(prompt) {
    var pm = prompt && prompt.targeting_jsonb && prompt.targeting_jsonb.page_match;
    if (!pm || !pm.value) return true;
    var path = window.location.pathname || "";
    var value = String(pm.value);
    switch (pm.mode) {
      case "starts_with":  return path.indexOf(value) === 0;
      case "contains":     return path.indexOf(value) !== -1;
      case "ends_with":    return path.length >= value.length && path.lastIndexOf(value) === path.length - value.length;
      case "exact":        return path === value;
      case "not_contains": return path.indexOf(value) === -1;
      default:             return true; // unknown mode → don't block (fail-open)
    }
  }

  // Cart-token gating (targeting_jsonb.cart_token_in). Fires the prompt only
  // for visitors whose CURRENT Shopify cart token is in the allowlist — i.e.
  // "prompt these specific abandoned carts and nobody else". Works where
  // identity targeting cannot: the cart cookie is Shopify's own and survives
  // ~2 weeks independent of our anon durability, so a returning abandoner is
  // recognised even if their Chapter identity has lapsed.
  //
  // The token is read from /cart.js, which is async, but trigger handlers are
  // synchronous — so we PRIME the token at prompt-load time and gate against
  // the cached value. Triggers that fire later (exit_intent, time_on_page,
  // scroll_depth) will always have it; a click in the first ~800ms may not,
  // which fails CLOSED for this gate (no token = no match = no fire). That is
  // the safe direction: better to miss a fire than show a targeted discount
  // to the wrong visitor.
  var chapterKnownCartToken = null;
  function chapterPrimeCartToken() {
    try {
      chapterFetchCartSnapshot().then(function (cart) {
        chapterKnownCartToken = (cart && cart.token) || null;
        chapterKnownCartItems = (cart && cart.items) ? cart.items.length : 0;
      });
    } catch (e) { /* noop */ }
  }

  function chapterMatchesCartToken(prompt) {
    var list = prompt && prompt.targeting_jsonb && prompt.targeting_jsonb.cart_token_in;
    if (!list || !list.length) return true;           // not configured → pass
    if (!chapterKnownCartToken) return false;         // unknown token → fail closed
    for (var i = 0; i < list.length; i++) {
      if (String(list[i]) === chapterKnownCartToken) return true;
    }
    return false;
  }

  // ---- Diagnostic logging --------------------------------------------------
  // Off by default. Turn on per-browser with either:
  //   localStorage.setItem('chapter_debug','1')    (persists)
  //   load any page with  #__chapter_debug         (one-off)
  // A prompt can fail to fire for many individually-silent reasons (a gate
  // returning false, an empty cart snapshot, a throw inside the promise
  // chain). This makes every step state what it decided.
  var chapterDebugOn = (function () {
    try {
      if (/__chapter_debug/.test(location.hash)) return true;
      return localStorage.getItem("chapter_debug") === "1";
    } catch (e) { return false; }
  })();
  function chapterDebug() {
    if (!chapterDebugOn) return;
    try {
      var a = Array.prototype.slice.call(arguments);
      a.unshift("[chapter]");
      console.log.apply(console, a);
    } catch (e) {}
  }

  // ---- Paid-entry gate -----------------------------------------------------
  // Reads the DURABLE server-set chapter_paid_entry_<client> cookie (see
  // /api/pixel). Deliberately not the older JS-set chapter_entry cookie, which
  // Safari ITP caps at ~7 days — measured coverage there was 39% of paid
  // journeys, so most paid clickers were unrecognisable on a later visit.
  // Fails CLOSED: no marker means we do not claim paid entry.
  function chapterHasPaidEntry(prompt) {
    var want = prompt && prompt.targeting_jsonb && prompt.targeting_jsonb.paid_entry;
    if (!want) return true;                    // not configured -> pass
    var raw = readCookieValue("chapter_paid_entry_" + clientKey);
    // TEMPORARY DIAGNOSTIC — pairs with paid_entry@init above.
    chapterDebug(
      "chapterHasPaidEntry: name=", "chapter_paid_entry_" + clientKey,
      "| raw=", raw,
      "| at t+", Math.round(performance.now()), "ms"
    );
    if (!raw) return false;
    var parsed = null;
    try { parsed = JSON.parse(raw); } catch (e) { return false; }
    if (!parsed || !parsed.p) return false;
    var list = want && want.platform_in;
    if (list && list.length) {
      for (var i = 0; i < list.length; i++) {
        if (String(list[i]) === parsed.p) return true;
      }
      return false;
    }
    return true;
  }

  // ---- Cart minimum-items gate --------------------------------------------
  // Fails CLOSED while the cart is unknown, so we never offer a cart-recovery
  // discount to someone we cannot confirm is holding a cart.
  var chapterKnownCartItems = null;
  function chapterMatchesCartMinItems(prompt) {
    var min = prompt && prompt.targeting_jsonb && prompt.targeting_jsonb.cart_min_items;
    if (!min) return true;
    if (chapterKnownCartItems === null) return false;
    return chapterKnownCartItems >= Number(min);
  }

  // ---- Tracked-event subscribers ------------------------------------------
  // var is hoisted, so a track() firing before this line still no-ops safely.
  var chapterTrackSubs = null;
  function chapterOnTrackedEvent(name, fn) {
    if (!chapterTrackSubs) chapterTrackSubs = [];
    chapterTrackSubs.push({ n: name, f: fn });
  }
  function chapterNotifyTracked(name, props) {
    if (!chapterTrackSubs) return;
    for (var i = 0; i < chapterTrackSubs.length; i++) {
      if (chapterTrackSubs[i].n === name) {
        try { chapterTrackSubs[i].f(props); } catch (e) {}
      }
    }
  }

  // ---- cart_hold trigger ---------------------------------------------------
  // Two firing paths in one prompt:
  //   * visitor ARRIVES holding a cart  -> fire delay_on_return_ms after load
  //   * visitor ADDS to cart this visit -> fire delay_after_add_ms after the add
  // No existing trigger expresses the second: time_on_page is relative to page
  // LOAD, this is relative to an EVENT. Combined with frequency=session and
  // max_shows_lifetime this yields "10s after the first add, then once per
  // visit for the next N visits".
  function chapterRegisterCartHoldTrigger(prompt) {
    var t = prompt.trigger_jsonb || {};
    var onReturn = Number(t.delay_on_return_ms) || 3000;
    var afterAdd = Number(t.delay_after_add_ms) || 10000;
    var fired = false;
    chapterDebug("cart_hold registered:", prompt.slug, "| onReturn", onReturn, "| afterAdd", afterAdd);

    function attempt(via) {
      if (fired) { chapterDebug("attempt(" + via + ") skipped - already fired"); return; }
      var gates = {
        throttled: chapterIsPromptThrottled(prompt),
        page: chapterMatchesPagePattern(prompt),
        paid: chapterHasPaidEntry(prompt),
        cartMin: chapterMatchesCartMinItems(prompt),
        cartToken: chapterMatchesCartToken(prompt),
      };
      chapterDebug("attempt(" + via + ") gates:", gates, "| knownCartItems:", chapterKnownCartItems);
      if (gates.throttled) return;
      if (!gates.page) return;
      if (!gates.paid) return;
      if (!gates.cartMin) return;
      if (!gates.cartToken) return;
      fired = true;
      chapterDebug("RENDERING", prompt.slug);
      chapterRenderPrompt(prompt);
    }

    // Path 1 - already holding a cart on arrival.
    try {
      chapterFetchCartSnapshot().then(function (cart) {
        chapterKnownCartItems = (cart && cart.items) ? cart.items.length : 0;
        chapterDebug("path1 snapshot resolved:", { items: chapterKnownCartItems, token: cart && cart.token });
        if (chapterKnownCartItems > 0) setTimeout(function () { attempt("path1"); }, onReturn);
        else chapterDebug("path1 NOT scheduled - cart empty or unknown");
      });
    } catch (e) { chapterDebug("path1 threw:", e); }

    // Path 2 - add_to_cart during this visit. Bust the 5s snapshot cache first
    // so we re-read the cart AFTER the add rather than serving the pre-add copy.
    chapterOnTrackedEvent("add_to_cart", function () {
      try {
        chapterCartSnapshotAt = 0;
        chapterCartSnapshotPromise = null;
        chapterFetchCartSnapshot().then(function (cart) {
          chapterKnownCartItems = (cart && cart.items) ? cart.items.length : 0;
          chapterKnownCartToken = (cart && cart.token) || chapterKnownCartToken;
        });
      } catch (e) { /* noop */ }
      chapterDebug("path2 add_to_cart seen; attempt in", afterAdd, "ms");
      setTimeout(function () { attempt("path2"); }, afterAdd);
    });
  }

  function chapterRegisterClickElementTrigger(prompt) {
    var selector = prompt.trigger_jsonb && prompt.trigger_jsonb.selector;
    if (!selector) return;
    document.addEventListener("click", function (e) {
      if (chapterIsPromptThrottled(prompt)) return;
      if (!chapterMatchesPagePattern(prompt)) return;
      if (!chapterMatchesCartToken(prompt)) return;
      var hit = e.target.closest(selector);
      if (!hit) return;
      e.preventDefault();
      chapterRenderPrompt(prompt);
    });
  }

  function chapterRegisterExitIntentTrigger(prompt) {
    document.addEventListener("mouseout", function (e) {
      if (chapterIsPromptThrottled(prompt)) return;
      if (!chapterMatchesPagePattern(prompt)) return;
      if (!chapterMatchesCartToken(prompt)) return;
      if (e.relatedTarget) return; // mouse moved to another element, not out of viewport
      if (e.clientY > 0) return;   // exit was sideways/below, not top
      chapterRenderPrompt(prompt);
    });
  }

  function chapterRegisterTimeOnPageTrigger(prompt) {
    var delay = (prompt.trigger_jsonb && prompt.trigger_jsonb.delay_ms) || 15000;
    setTimeout(function () {
      if (chapterIsPromptThrottled(prompt)) return;
      if (!chapterMatchesPagePattern(prompt)) return;
      if (!chapterMatchesCartToken(prompt)) return;
      chapterRenderPrompt(prompt);
    }, delay);
  }

  function chapterRegisterScrollDepthTrigger(prompt) {
    var threshold = (prompt.trigger_jsonb && prompt.trigger_jsonb.percent) || 50;
    var fired = false;
    window.addEventListener("scroll", function () {
      if (fired) return;
      if (chapterIsPromptThrottled(prompt)) return;
      if (!chapterMatchesPagePattern(prompt)) return;
      if (!chapterMatchesCartToken(prompt)) return;
      var pct = getScrollPercent();
      if (pct >= threshold) {
        fired = true;
        chapterRenderPrompt(prompt);
      }
    }, { passive: true });
  }

  // Page-depth trigger: fires once when the visitor's session page-view count
  // meets or exceeds the operator's threshold. Counter is incremented ONCE per
  // pixel load (see chapterBumpPageDepth below) + persisted in sessionStorage,
  // so a fresh tab resets to 0. Frequency (session/visitor) still gates re-fires.
  function chapterRegisterPageDepthTrigger(prompt) {
    var threshold = (prompt.trigger_jsonb && prompt.trigger_jsonb.pages) || 3;
    var current = chapterGetPageDepth();
    if (current < threshold) return;               // not yet — wait for next load
    if (chapterIsPromptThrottled(prompt)) return;
    if (!chapterMatchesPagePattern(prompt)) return;
      if (!chapterMatchesCartToken(prompt)) return;
    // Fire after a tiny delay so page render settles + other pixel work runs.
    setTimeout(function () { chapterRenderPrompt(prompt); }, 250);
  }

  // Session page counter. Increments on pixel init (once per real page load).
  var chapterPageDepthKey = "chapter_page_depth";
  function chapterBumpPageDepth() {
    try {
      var n = parseInt(sessionStorage.getItem(chapterPageDepthKey) || "0", 10) || 0;
      n += 1;
      sessionStorage.setItem(chapterPageDepthKey, String(n));
    } catch (e) { /* sessionStorage blocked; page_depth trigger will no-op */ }
  }
  function chapterGetPageDepth() {
    try {
      return parseInt(sessionStorage.getItem(chapterPageDepthKey) || "0", 10) || 0;
    } catch (e) { return 0; }
  }
  chapterBumpPageDepth();

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
        // W1 rollout flag. Strict === true so a missing/garbled field leaves
        // batching OFF (today's behaviour) rather than switching it on.
        chapterBatchingEnabled = !!(data && data.batching_enabled === true);
        // Persist so the NEXT page load can batch from its very first event.
        try {
          if (chapterBatchingEnabled) localStorage.setItem(CHAPTER_BATCH_FLAG_KEY, "1");
          else localStorage.removeItem(CHAPTER_BATCH_FLAG_KEY);
        } catch (e) {}
        var prompts = (data && data.prompts) || [];
        // Only hit /cart.js when a prompt actually needs the token — keeps the
        // extra request off every client that doesn't use cart-token targeting.
        var needsCartToken = prompts.some(function (p) {
          var tg = (p && p.targeting_jsonb) || {};
          var trg = (p && p.trigger_jsonb) || {};
          return !!((tg.cart_token_in && tg.cart_token_in.length)
            || tg.cart_min_items || trg.type === "cart_hold");
        });
        chapterDebug("prompts loaded:", prompts.length, prompts.map(function (p) {
          return p.slug + " [" + ((p.trigger_jsonb || {}).type || "?") + "]";
        }), "| needsCartToken:", needsCartToken);
        if (needsCartToken) chapterPrimeCartToken();
        prompts.forEach(function (prompt) {
          var trig = prompt.trigger_jsonb || {};
          if (trig.type === "click_element") chapterRegisterClickElementTrigger(prompt);
          else if (trig.type === "exit_intent") chapterRegisterExitIntentTrigger(prompt);
          else if (trig.type === "time_on_page") chapterRegisterTimeOnPageTrigger(prompt);
          else if (trig.type === "scroll_depth") chapterRegisterScrollDepthTrigger(prompt);
          else if (trig.type === "page_depth") chapterRegisterPageDepthTrigger(prompt);
          else if (trig.type === "cart_hold") chapterRegisterCartHoldTrigger(prompt);
        });
      })
      .catch(function (e) {
        try { console.error("[chapter] identity-prompts chain failed:", e); } catch (_) {}
      });
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