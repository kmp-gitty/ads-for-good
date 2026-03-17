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