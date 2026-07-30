// GET /api/chapter/picker.js
//
// The pixel injects this on the client's own site when picker mode is active
// (the dashboard opened the site with #__chapter_pick). It lets a non-technical
// owner hover + click the element they want their prompt to trigger on, then
// sends the generated CSS selector straight back to the dashboard tab via
// postMessage — no copy/paste, no bookmarklet.
//
// Picker mode persists via sessionStorage so the owner can navigate to the
// right page first, then pick. Selector-generation is the same proven strategy
// as the operator picker (/api/internal/picker.js).

import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
  return new NextResponse(SCRIPT, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

const SCRIPT = `(function () {
  if (window.__chapterPickerActive) return;
  window.__chapterPickerActive = true;

  // Mode detection — element (default) or color. Persisted in sessionStorage
  // so it survives cross-page navigation. Hash flag: #__chapter_pick_color for
  // color mode; anything else = element mode.
  var MODE = (function () {
    try {
      if (/__chapter_pick_color/.test(location.hash)) return "color";
      var stored = sessionStorage.getItem("__chapter_pick_mode");
      if (stored === "color") return "color";
      return "element";
    } catch (e) { return "element"; }
  })();
  try {
    sessionStorage.setItem("__chapter_pick", "1");
    sessionStorage.setItem("__chapter_pick_mode", MODE);
  } catch (e) {}

  var STYLE_ID = "chapter-picker-styles";
  if (!document.getElementById(STYLE_ID)) {
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = [
      ".chapter-picker-hl{outline:2px dashed #E36410 !important;outline-offset:2px !important;cursor:crosshair !important;}",
      ".chapter-picker-panel{position:fixed;top:16px;right:16px;z-index:2147483647;background:#1F2D43;color:#fff;border-radius:12px;padding:16px 18px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13px;box-shadow:0 10px 30px rgba(0,0,0,.3);max-width:340px;}",
      ".chapter-picker-panel h4{margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#FED7AA;font-weight:700;}",
      ".chapter-picker-panel .chapter-picker-instr{font-size:12.5px;color:#CBD5E1;line-height:1.45;margin:0 0 10px;}",
      ".chapter-picker-panel .chapter-picker-selector{font-family:ui-monospace,SFMono-Regular,monospace;font-size:12px;background:#0F172A;padding:8px 10px;border-radius:6px;color:#FED7AA;word-break:break-all;margin:0 0 12px;border:1px solid #334155;}",
      ".chapter-picker-panel .chapter-picker-swatch{display:inline-block;width:28px;height:28px;border-radius:6px;vertical-align:middle;margin-right:8px;border:2px solid #FFF;box-shadow:0 0 0 1px rgba(255,255,255,0.2);}",
      ".chapter-picker-panel .chapter-picker-colorbox{display:flex;align-items:center;background:#0F172A;padding:8px 10px;border-radius:6px;margin:0 0 12px;border:1px solid #334155;}",
      ".chapter-picker-panel .chapter-picker-colorhex{font-family:ui-monospace,SFMono-Regular,monospace;font-size:14px;color:#FED7AA;font-weight:700;letter-spacing:0.06em;}",
      ".chapter-picker-panel button{background:#E36410;color:#fff;border:0;border-radius:7px;padding:8px 14px;font-size:12.5px;font-weight:600;cursor:pointer;margin-right:6px;font-family:inherit;}",
      ".chapter-picker-panel button:hover{background:#C9550B;}",
      ".chapter-picker-panel button:disabled{opacity:.5;cursor:default;}",
      ".chapter-picker-panel button.chapter-picker-secondary{background:#334155;}",
      ".chapter-picker-panel button.chapter-picker-secondary:hover{background:#475569;}",
      ".chapter-picker-panel .chapter-picker-hint{font-size:11px;color:#94A3B8;margin-top:10px;}",
    ].join("");
    document.head.appendChild(style);
  }

  var panel = document.createElement("div");
  panel.className = "chapter-picker-panel";
  if (MODE === "color") {
    panel.innerHTML = [
      '<h4>Chapter · pick a color</h4>',
      '<p class="chapter-picker-instr">Hover over any element with a colored background (e.g. a button). <strong>Click to lock</strong> the color, then press <strong>Use this color</strong>.</p>',
      '<div class="chapter-picker-colorbox" id="chapter-picker-out">',
      '  <span class="chapter-picker-swatch" id="chapter-picker-swatch" style="background:transparent;"></span>',
      '  <span class="chapter-picker-colorhex" id="chapter-picker-hex">Hover an element…</span>',
      '</div>',
      '<button id="chapter-picker-use" disabled>Use this color</button>',
      '<button class="chapter-picker-secondary" id="chapter-picker-cancel">Cancel</button>',
      '<p class="chapter-picker-hint">Press <strong>Esc</strong> to cancel · we walk up the parent chain when the direct element is transparent.</p>',
    ].join("");
  } else {
    panel.innerHTML = [
      '<h4>Chapter · pick an element</h4>',
      '<p class="chapter-picker-instr">Navigate to any page. Hover to highlight, then <strong>click the element</strong> you want — it locks in. Then press <strong>Use this element</strong>.</p>',
      '<div class="chapter-picker-selector" id="chapter-picker-out">Click an element…</div>',
      '<button id="chapter-picker-use" disabled>Use this element</button>',
      '<button class="chapter-picker-secondary" id="chapter-picker-cancel">Cancel</button>',
      '<p class="chapter-picker-hint">Press <strong>Esc</strong> to cancel · click a different element to re-pick.</p>',
    ].join("");
  }
  document.body.appendChild(panel);

  var out = panel.querySelector("#chapter-picker-out");
  var swatchEl = panel.querySelector("#chapter-picker-swatch");
  var hexEl = panel.querySelector("#chapter-picker-hex");
  var useBtn = panel.querySelector("#chapter-picker-use");
  var cancelBtn = panel.querySelector("#chapter-picker-cancel");
  var currentSelector = "";
  var currentHex = "";
  var lastHl = null;
  var locked = false;
  var instr = panel.querySelector(".chapter-picker-instr");

  // Color extraction — walks up parent chain until non-transparent bg found.
  // Returns hex string like "#e36410" (lowercase, always 6 digits) or "".
  function rgbToHex(rgb) {
    if (!rgb) return "";
    var m = rgb.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)(?:,\\s*([\\d.]+))?\\)/);
    if (!m) return "";
    // Fully transparent → treat as no color
    if (m[4] !== undefined && parseFloat(m[4]) === 0) return "";
    function h(n) { var v = parseInt(n).toString(16); return v.length === 1 ? "0" + v : v; }
    return "#" + h(m[1]) + h(m[2]) + h(m[3]);
  }
  function extractColor(el) {
    var node = el;
    for (var i = 0; i < 8 && node && node.nodeType === 1; i++) {
      var bg = window.getComputedStyle(node).backgroundColor;
      var hex = rgbToHex(bg);
      if (hex) return hex;
      node = node.parentElement;
    }
    return "";
  }

  function isInPanel(el) { return panel.contains(el); }
  function highlight(el) {
    if (lastHl && lastHl !== el) lastHl.classList.remove("chapter-picker-hl");
    if (el) el.classList.add("chapter-picker-hl");
    lastHl = el;
  }
  function clearHighlight() { if (lastHl) lastHl.classList.remove("chapter-picker-hl"); lastHl = null; }

  var PICKER_CLASSES = { "chapter-picker-hl": 1, "chapter-picker-panel": 1 };

  function genSelector(el) {
    if (!el || el.nodeType !== 1) return "";
    if (el.id && safeQuery("#" + cssEscape(el.id)).length === 1) return "#" + el.id;
    var realClasses = el.classList ? Array.from(el.classList).filter(function (c) { return !PICKER_CLASSES[c]; }) : [];
    if (realClasses.length > 0) {
      var classes = realClasses.map(cssEscape);
      var tagCls = el.tagName.toLowerCase() + "." + classes.join(".");
      if (safeQuery(tagCls).length === 1) return tagCls;
      var clsOnly = "." + classes.join(".");
      if (safeQuery(clsOnly).length === 1) return clsOnly;
    }
    if (el.tagName === "A") {
      var href = el.getAttribute("href");
      if (href) {
        var sel = 'a[href="' + href.replace(/"/g, '\\\\"') + '"]';
        if (safeQuery(sel).length === 1) return sel;
      }
    }
    var attrs = ["data-id","data-test","data-testid","data-cy","data-action","name","role","aria-label"];
    for (var i = 0; i < attrs.length; i++) {
      var v = el.getAttribute(attrs[i]);
      if (v) {
        var attrSel = el.tagName.toLowerCase() + "[" + attrs[i] + '="' + v.replace(/"/g, '\\\\"') + '"]';
        if (safeQuery(attrSel).length === 1) return attrSel;
      }
    }
    var path = [];
    var node = el;
    while (node && node.nodeType === 1 && node !== document.body) {
      var step = node.tagName.toLowerCase();
      var parent = node.parentElement;
      if (parent) {
        var siblings = Array.from(parent.children).filter(function (c) { return c.tagName === node.tagName; });
        if (siblings.length > 1) step += ":nth-of-type(" + (siblings.indexOf(node) + 1) + ")";
      }
      if (node.id) { path.unshift("#" + node.id); break; }
      path.unshift(step);
      node = parent;
    }
    return path.join(" > ");
  }

  function cssEscape(s) {
    if (window.CSS && window.CSS.escape) return window.CSS.escape(s);
    return String(s).replace(/[^a-zA-Z0-9_-]/g, "\\\\$&");
  }
  function safeQuery(sel) { try { return document.querySelectorAll(sel); } catch (e) { return []; } }

  function updateHexDisplay(hex) {
    currentHex = hex;
    if (MODE === "color" && hexEl && swatchEl) {
      if (hex) {
        hexEl.textContent = hex.toUpperCase();
        swatchEl.style.background = hex;
        useBtn.disabled = false;
      } else {
        hexEl.textContent = "(transparent — try another element)";
        swatchEl.style.background = "transparent";
        useBtn.disabled = true;
      }
    }
  }

  function onMove(e) {
    if (locked || e.shiftKey) return; // once locked (clicked), hovering no longer changes the selection
    var t = e.target;
    if (!t || isInPanel(t) || t === lastHl) return;
    highlight(t);
    if (MODE === "color") {
      updateHexDisplay(extractColor(t));
    } else {
      var sel = genSelector(t);
      out.textContent = sel || "(unable to derive)";
      currentSelector = sel;
      useBtn.disabled = !sel;
    }
  }
  function onClick(e) {
    var t = e.target;
    if (isInPanel(t)) return;
    e.preventDefault();
    e.stopPropagation();
    highlight(t);
    if (MODE === "color") {
      var hex = extractColor(t);
      updateHexDisplay(hex);
      if (hex) {
        locked = true;
        if (instr) instr.innerHTML = "Locked \\u2713 <span style=\\"background:" + hex + ";display:inline-block;width:12px;height:12px;border-radius:3px;vertical-align:middle;border:1px solid #FFF;\\"></span> " + hex.toUpperCase() + " — press <strong>Use this color</strong>, or click a different element to change it.";
      }
    } else {
      var sel = genSelector(t);
      currentSelector = sel;
      out.textContent = sel || "(unable to derive)";
      useBtn.disabled = !sel;
      if (sel) {
        locked = true;
        if (instr) instr.innerHTML = "Locked \\u2713 — press <strong>Use this element</strong>, or click a different element to change it.";
      }
    }
  }
  function onKey(e) { if (e.key === "Escape") cancel(); }

  function stopListening() {
    document.removeEventListener("mousemove", onMove, true);
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("keydown", onKey, true);
    clearHighlight();
  }

  function done(html) {
    stopListening();
    try {
      sessionStorage.removeItem("__chapter_pick");
      sessionStorage.removeItem("__chapter_pick_mode");
    } catch (e) {}
    panel.innerHTML = html;
    var c = panel.querySelector("#chapter-picker-doneclose");
    if (c) c.addEventListener("click", function () { if (panel.parentNode) panel.parentNode.removeChild(panel); window.__chapterPickerActive = false; });
  }

  function useSelector() {
    if (!currentSelector) return;
    var sent = false;
    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ type: "chapter_pick_selector", selector: currentSelector }, "*");
        sent = true;
      }
    } catch (e) {}
    if (sent) {
      done('<h4>Sent to Chapter ✓</h4><p class="chapter-picker-instr">Your prompt is set to trigger on:</p><div class="chapter-picker-selector">' + currentSelector + '</div><button id="chapter-picker-doneclose">Close</button>');
    } else {
      // No opener (tab was reloaded / opened directly) — fall back to copy.
      var copied = false;
      try { navigator.clipboard.writeText(currentSelector); copied = true; } catch (e) {}
      done('<h4>Copy this selector</h4><p class="chapter-picker-instr">' + (copied ? "Copied to your clipboard — " : "") + 'paste it into the CSS selector field in Chapter.</p><div class="chapter-picker-selector">' + currentSelector + '</div><button id="chapter-picker-doneclose">Close</button>');
    }
  }

  function useColor() {
    if (!currentHex) return;
    var sent = false;
    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ type: "chapter_pick_color", hex: currentHex }, "*");
        sent = true;
      }
    } catch (e) {}
    var swatch = '<span style="background:' + currentHex + ';display:inline-block;width:36px;height:36px;border-radius:6px;vertical-align:middle;margin-right:10px;border:2px solid #FFF;box-shadow:0 0 0 1px rgba(255,255,255,0.2);"></span>';
    var hexLabel = '<span class="chapter-picker-colorhex">' + currentHex.toUpperCase() + '</span>';
    if (sent) {
      done('<h4>Sent to Chapter ✓</h4><p class="chapter-picker-instr">Button color set to:</p><div class="chapter-picker-colorbox">' + swatch + hexLabel + '</div><button id="chapter-picker-doneclose">Close</button>');
    } else {
      var copied = false;
      try { navigator.clipboard.writeText(currentHex); copied = true; } catch (e) {}
      done('<h4>Copy this color</h4><p class="chapter-picker-instr">' + (copied ? "Copied to your clipboard — " : "") + 'paste it into the color field in Chapter.</p><div class="chapter-picker-colorbox">' + swatch + hexLabel + '</div><button id="chapter-picker-doneclose">Close</button>');
    }
  }

  function cancel() {
    stopListening();
    try {
      sessionStorage.removeItem("__chapter_pick");
      sessionStorage.removeItem("__chapter_pick_mode");
    } catch (e) {}
    if (panel.parentNode) panel.parentNode.removeChild(panel);
    window.__chapterPickerActive = false;
  }

  useBtn.addEventListener("click", function (e) { e.stopPropagation(); if (MODE === "color") useColor(); else useSelector(); });
  cancelBtn.addEventListener("click", function (e) { e.stopPropagation(); cancel(); });
  document.addEventListener("mousemove", onMove, true);
  document.addEventListener("click", onClick, true);
  document.addEventListener("keydown", onKey, true);
})();
`;
