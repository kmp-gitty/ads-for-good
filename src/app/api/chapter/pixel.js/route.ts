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

  var clientKey = getClientKey();
  var collectUrl = getCollectUrl();

  function send(eventName, props) { if (!clientKey) return;
    try {
      var body = {
        client_key: clientKey,
        event_name: eventName,
        page_url: window.location.href,
        page_path: window.location.pathname,
        referrer: document.referrer || null,
        props: props || {},
        consent_mode: "opt_out"
      };

      fetch(collectUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        keepalive: true,
        body: JSON.stringify(body)
      }).catch(function () {});
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