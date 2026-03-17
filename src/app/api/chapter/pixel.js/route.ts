import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest) {
  const script = `
(function () {
  var existing = window.ChapterPixel;

  if (existing && existing.__chapterLoaded) return;

  var queue = Array.isArray(existing) ? existing : [];

  function getCurrentScript() {
    return document.currentScript;
  }

  function getClientKey() {
  var s = getCurrentScript();
  var attr = s && s.getAttribute("data-client-key");
  return attr || null;
}

  function getCollectUrl() {
    var s = getCurrentScript();
    var attr = s && s.getAttribute("data-collect-url");
    return attr || "/api/chapter/collect";
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

    function send(eventName, props) {
    if (!clientKey) return;

    try {
      var body = {
        _buffer_id: (window.crypto && window.crypto.randomUUID)
          ? window.crypto.randomUUID()
          : String(Date.now()) + "_" + String(Math.random()).slice(2),
        client_key: clientKey,
        event_name: eventName,
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
        fetch("/api/identify", {
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

document.addEventListener("mouseover", function (e) {
  var el = e.target.closest("a, button");

  if (!el) return;

  hoverTarget = el;

  hoverTimer = setTimeout(function () {
    if (hoverTarget === el) {
      api.track("hover_intent", {
        label: getClickableLabel(el),
        tag: el.tagName
      });
    }
  }, 500); // threshold
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