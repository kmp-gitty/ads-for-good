// Chapter slide impression script (MetaSlider / FlexSlider). Served by
// /api/chapter/imp.js with "__CHAPTER_IMP_CFG__" replaced by a JSON config.
//
// Counts per slide, per page view:
//   rendered    the slide became the active slide
//   impressions the active slide had >= 1px inside the viewport in a visible tab
//               (once per showing; rotating away and back is a new showing)
//   viewable    same showing >= 50% in the viewport for 1 continuous second in a
//               visible tab; 30% for slides of 242,500 px or more (IAB/MRC)
//
// MetaSlider's fade mode stacks every slide in the same box and hides the
// inactive ones with opacity:0, so geometry alone says all of them are on
// screen. Only the slide FlexSlider marks flex-active-slide is ever measured.
//
// Slides are identified by their wrapped Chapter Link (link= param), never by
// position: MetaSlider shuffles order on each load.
//
// Also: cross-paper identity handoff. A click on a plain link to another of the
// client's papers gets chx=<visitor id>&chxf=<this paper> appended; the landing
// paper's beacon records both IDs as the same reader.
//
// NO BACKTICKS OR DOLLAR-BRACE IN THE SCRIPT BODY: it lives in a template
// literal. Check with: extract the body and run node --check.
export const IMPRESSION_SCRIPT = String.raw`(function () {
  "use strict";
  if (window.__chapterImpLoaded) return;
  window.__chapterImpLoaded = true;

  var CFG = __CHAPTER_IMP_CFG__;
  var ua = navigator.userAgent || "";
  if (/ACJ-LinkCheck/i.test(ua)) return;
  if (typeof IntersectionObserver === "undefined" || typeof MutationObserver === "undefined") return;

  var LARGE_AD_PX = 242500;
  var LS_KEY = "chapter_imp_id_" + CFG.k;
  var COOKIE = "up_anon_" + CFG.k;
  var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  var host = location.hostname.replace(/^www\./, "").toLowerCase();

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    var b = new Uint8Array(16);
    (window.crypto || {}).getRandomValues ? crypto.getRandomValues(b) : b.forEach(function (_, i) { b[i] = Math.floor(Math.random() * 256); });
    b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
    var h = Array.prototype.map.call(b, function (x) { return (x + 256).toString(16).slice(1); }).join("");
    return h.slice(0, 8) + "-" + h.slice(8, 12) + "-" + h.slice(12, 16) + "-" + h.slice(16, 20) + "-" + h.slice(20);
  }
  function lsGet() { try { var v = localStorage.getItem(LS_KEY); return v && UUID_RE.test(v) ? v : null; } catch (e) { return null; } }
  function lsSet(v) { try { localStorage.setItem(LS_KEY, v); } catch (e) {} }
  function cookieId() {
    var m = document.cookie.match(new RegExp("(?:^|; )" + COOKIE + "=([^;]*)"));
    var v = m ? decodeURIComponent(m[1]) : null;
    return v && UUID_RE.test(v) ? v : null;
  }
  function visitorId() { return cookieId() || lsGet(); }

  var pvId = uuid();
  var pvTs = Date.now();
  var seq = 0;
  var dirty = false;
  var sentOnce = false;

  // ---- Cross-paper handoff: landing side ----
  var xref = null;
  try {
    var qp = new URLSearchParams(location.search);
    var chx = qp.get("chx"), chxf = (qp.get("chxf") || "").toLowerCase();
    if (chx || chxf) {
      if (chx && UUID_RE.test(chx) && CFG.papers.indexOf(chxf) >= 0 && chxf !== host) xref = { id: chx, from: chxf };
      qp.delete("chx"); qp.delete("chxf");
      var qs = qp.toString();
      history.replaceState(history.state, "", location.pathname + (qs ? "?" + qs : "") + location.hash);
      if (xref) dirty = true;
    }
  } catch (e) {}

  // ---- Cross-paper handoff: leaving side ----
  function decorate(ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest("a[href]") : null;
    if (!a) return;
    var id = visitorId();
    if (!id) return;
    try {
      var u = new URL(a.href, location.href);
      var h = u.hostname.replace(/^www\./, "").toLowerCase();
      if (h === host || CFG.papers.indexOf(h) < 0) return;
      if (u.searchParams.get("chx")) return;
      u.searchParams.set("chx", id);
      u.searchParams.set("chxf", host);
      a.href = u.toString();
    } catch (e) {}
  }
  document.addEventListener("mousedown", decorate, true);
  document.addEventListener("touchstart", decorate, { capture: true, passive: true });
  document.addEventListener("keydown", function (ev) { if (ev.key === "Enter") decorate(ev); }, true);

  // ---- Slides ----
  var recs = {};          // key -> counters, sent to Chapter
  var sliders = [];       // { el, lis, activeLi, showing }
  var ratioByLi = new WeakMap();

  function readSlide(li, sliderId) {
    return readLink(li.querySelector("a[href]"), sliderId, li);
  }

  function readLink(a, sliderId, el) {
    if (!a) return null;
    var u;
    try { u = new URL(a.getAttribute("href"), location.href); } catch (e) { return null; }
    if (u.pathname.indexOf("/r/" + CFG.k + "/") !== 0) return null;
    var p = u.searchParams;
    var link = p.get("link") || "";
    var creative = p.get("creative") || (((el.className || "").match(/slide-(\d+)/) || [])[1] || "");
    var key = sliderId + "|" + (link || "c" + creative);
    if (!recs[key]) {
      recs[key] = {
        link: link, slug: u.pathname.split("/")[3] || "", partner: p.get("partner") || "",
        promo: p.get("promo") || "", loc: p.get("loc") || "", size: p.get("size") || "",
        creative: creative, slider: sliderId, rendered: 0, impressions: 0, viewable: 0
      };
    }
    return key;
  }

  var io = new IntersectionObserver(function (entries) {
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i];
      ratioByLi.set(e.target, e.isIntersecting ? e.intersectionRatio : 0);
    }
    evaluateAll();
  }, { threshold: [0, 0.01, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.8, 1] });

  function activeOf(s) {
    for (var i = 0; i < s.lis.length; i++) if (s.lis[i].classList.contains("flex-active-slide")) return s.lis[i];
    return null;
  }

  function startShowing(s, li) {
    clearTimeout(s.showing && s.showing.timer);
    s.activeLi = li;
    var key = li ? li.__chapterKey : null;
    s.showing = { key: key, impressed: false, viewed: false, timer: null };
    if (key) { recs[key].rendered++; dirty = true; }
    evaluate(s);
  }

  function evaluate(s) {
    var sh = s.showing, li = s.activeLi;
    if (!sh || !sh.key || !li) return;
    var rec = recs[sh.key];
    var visible = document.visibilityState === "visible";
    var ratio = ratioByLi.get(li) || 0;
    if (visible && ratio > 0 && !sh.impressed) {
      sh.impressed = true; rec.impressions++; dirty = true;
      if (!sentOnce) setTimeout(flush, 2000);
    }
    if (sh.viewed) return;
    var r = li.getBoundingClientRect();
    var need = (r.width * r.height >= LARGE_AD_PX) ? 0.3 : 0.5;
    if (visible && ratio >= need) {
      if (!sh.timer) {
        sh.timer = setTimeout(function () {
          sh.timer = null;
          if (s.showing !== sh || sh.viewed) return;
          var rr = li.getBoundingClientRect();
          var n2 = (rr.width * rr.height >= LARGE_AD_PX) ? 0.3 : 0.5;
          if (document.visibilityState === "visible" && (ratioByLi.get(li) || 0) >= n2) {
            sh.viewed = true; rec.viewable++; dirty = true;
          }
        }, 1000);
      }
    } else if (sh.timer) {
      clearTimeout(sh.timer); sh.timer = null;
    }
  }
  function evaluateAll() { for (var i = 0; i < sliders.length; i++) evaluate(sliders[i]); }

  // Static placements (partner logos, fixed banners): a wrapped link around an
  // image, outside any slider. Always "active", so one showing per page view;
  // impression and viewability use the same rules as slides, measured on the image.
  function setupStatic() {
    var as = document.querySelectorAll("a[href]");
    for (var i = 0; i < as.length; i++) {
      var a = as[i];
      if (a.__chapterImp || (a.closest && a.closest(".metaslider"))) continue;
      var img = a.querySelector("img");
      if (!img) continue;
      a.__chapterImp = true;
      var key = readLink(a, "static", img);
      if (!key) continue;
      img.__chapterKey = key;
      var s = { el: a, lis: [img], activeLi: null, showing: null };
      sliders.push(s);
      io.observe(img);
      startShowing(s, img);
    }
  }

  function setup() {
    setupStatic();
    var els = document.querySelectorAll(".metaslider");
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.__chapterImp) continue;
      el.__chapterImp = true;
      var sliderId = (el.id || "").replace(/^metaslider-id-/, "") || String(i);
      var lis = Array.prototype.slice.call(el.querySelectorAll("ul.slides > li"));
      var s = { el: el, lis: [], activeLi: null, showing: null };
      for (var j = 0; j < lis.length; j++) {
        var key = readSlide(lis[j], sliderId);
        if (!key) continue;
        lis[j].__chapterKey = key;
        s.lis.push(lis[j]);
        io.observe(lis[j]);
      }
      if (!s.lis.length) continue;
      sliders.push(s);
      (function (s) {
        var mo = new MutationObserver(function () {
          var a = activeOf(s);
          if (a !== s.activeLi) startShowing(s, a);
        });
        for (var k = 0; k < s.lis.length; k++) mo.observe(s.lis[k], { attributes: true, attributeFilter: ["class"] });
        startShowing(s, activeOf(s));
      })(s);
    }
  }

  // ---- Sending ----
  function payload() {
    var list = [];
    for (var k in recs) if (recs[k].rendered > 0) list.push(recs[k]);
    return JSON.stringify({
      k: CFG.k, pv: pvId, pv_ts: pvTs, seq: ++seq, host: host,
      path: location.pathname, ls: lsGet(), xref: xref,
      wd: navigator.webdriver === true, slides: list
    });
  }
  function flush(final) {
    if (!dirty) return;
    dirty = false;
    var body = payload();
    if (!sentOnce) {
      sentOnce = true;
      // First send by fetch so the response can hand back the visitor ID,
      // which is kept in localStorage in case the cookie is lost later.
      try {
        fetch(CFG.endpoint, { method: "POST", body: body, credentials: "include", keepalive: true,
          headers: { "Content-Type": "text/plain" } })
          .then(function (r) { return r.json(); })
          .then(function (j) { if (j && j.id && UUID_RE.test(j.id)) lsSet(j.id); })
          .catch(function () {});
      } catch (e) {}
      return;
    }
    var sent = false;
    try { sent = navigator.sendBeacon(CFG.endpoint, new Blob([body], { type: "text/plain" })); } catch (e) {}
    if (!sent && !final) {
      try { fetch(CFG.endpoint, { method: "POST", body: body, credentials: "include", keepalive: true, headers: { "Content-Type": "text/plain" } }); } catch (e) {}
    }
  }

  document.addEventListener("visibilitychange", function () {
    evaluateAll();
    if (document.visibilityState === "hidden") flush(true);
  });
  window.addEventListener("pagehide", function () { flush(true); });
  setInterval(function () { flush(false); }, 60000);

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setup);
  else setup();
  window.addEventListener("load", setup);
  // A page with no slider still reports a cross-paper arrival.
  if (xref) setTimeout(function () { if (!sentOnce) flush(false); }, 3000);
})();`;
