// GET /api/internal/picker.js
//
// Serves the CSS-selector picker script. Operator drags a bookmarklet to
// their bookmarks bar; clicking it injects this script into the current
// page. The script lets the operator hover/click any element on the
// storefront and get back a stable CSS selector they can paste into the
// identity-prompts admin form.
//
// Returned as a string so the bookmarklet stays tiny (it just <script>
// injects this URL). That keeps us free to update picker UX without
// asking operators to re-drag the bookmarklet.

import { NextResponse } from "next/server";

export const dynamic = "force-static";
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
  if (window.__chapterPickerActive) {
    console.log("[chapter-picker] already active");
    return;
  }
  window.__chapterPickerActive = true;

  var STYLE_ID = "chapter-picker-styles";
  if (!document.getElementById(STYLE_ID)) {
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = [
      ".chapter-picker-hl{outline:2px dashed #E36410 !important;outline-offset:2px !important;cursor:crosshair !important;}",
      ".chapter-picker-panel{position:fixed;top:16px;right:16px;z-index:2147483647;background:#1F2D43;color:#fff;border-radius:12px;padding:14px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13px;box-shadow:0 10px 30px rgba(0,0,0,.3);max-width:380px;}",
      ".chapter-picker-panel h4{margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#FED7AA;font-weight:700;}",
      ".chapter-picker-panel .chapter-picker-instr{font-size:12px;color:#CBD5E1;line-height:1.4;margin:0 0 10px;}",
      ".chapter-picker-panel .chapter-picker-selector{font-family:ui-monospace,SFMono-Regular,monospace;font-size:12px;background:#0F172A;padding:8px 10px;border-radius:6px;color:#FED7AA;word-break:break-all;margin:0 0 10px;border:1px solid #334155;}",
      ".chapter-picker-panel button{background:#E36410;color:#fff;border:0;border-radius:6px;padding:6px 12px;font-size:12px;font-weight:600;cursor:pointer;margin-right:6px;font-family:inherit;}",
      ".chapter-picker-panel button:hover{background:#C9550B;}",
      ".chapter-picker-panel button.chapter-picker-secondary{background:#334155;}",
      ".chapter-picker-panel button.chapter-picker-secondary:hover{background:#475569;}",
      ".chapter-picker-panel .chapter-picker-hint{font-size:11px;color:#94A3B8;margin-top:8px;}",
    ].join("");
    document.head.appendChild(style);
  }

  var panel = document.createElement("div");
  panel.className = "chapter-picker-panel";
  panel.innerHTML = [
    '<h4>Chapter element picker</h4>',
    '<p class="chapter-picker-instr">Hover any element on the page. Click to capture its CSS selector.</p>',
    '<div class="chapter-picker-selector" id="chapter-picker-out">Click anything…</div>',
    '<button id="chapter-picker-copy" disabled>Copy</button>',
    '<button class="chapter-picker-secondary" id="chapter-picker-close">Close</button>',
    '<p class="chapter-picker-hint">Press <strong>Esc</strong> to exit. <strong>Shift</strong>-hover to ignore.</p>',
  ].join("");
  document.body.appendChild(panel);

  var out = panel.querySelector("#chapter-picker-out");
  var copyBtn = panel.querySelector("#chapter-picker-copy");
  var closeBtn = panel.querySelector("#chapter-picker-close");
  var currentSelector = "";
  var lastHl = null;

  function isInPanel(el) {
    return panel.contains(el);
  }

  function highlight(el) {
    if (lastHl && lastHl !== el) lastHl.classList.remove("chapter-picker-hl");
    if (el) el.classList.add("chapter-picker-hl");
    lastHl = el;
  }

  function clearHighlight() {
    if (lastHl) lastHl.classList.remove("chapter-picker-hl");
    lastHl = null;
  }

  // Selector generation: prefer #id, then tag.class combinations, then
  // data-* attributes, then a :nth-of-type path. Always check uniqueness.
  function genSelector(el) {
    if (!el || el.nodeType !== 1) return "";
    if (el.id && safeQuery("#" + cssEscape(el.id)).length === 1) {
      return "#" + el.id;
    }
    if (el.classList && el.classList.length > 0) {
      var classes = Array.from(el.classList).map(cssEscape);
      // Try tag+classes first, then classes alone
      var tagCls = el.tagName.toLowerCase() + "." + classes.join(".");
      if (safeQuery(tagCls).length === 1) return tagCls;
      var clsOnly = "." + classes.join(".");
      if (safeQuery(clsOnly).length === 1) return clsOnly;
    }
    // data-* attributes (and a few stable ones like name, role, aria-label)
    var attrs = ["data-id","data-test","data-testid","data-cy","data-action","name","role","aria-label"];
    for (var i = 0; i < attrs.length; i++) {
      var v = el.getAttribute(attrs[i]);
      if (v) {
        var sel = el.tagName.toLowerCase() + "[" + attrs[i] + '="' + v.replace(/"/g, '\\\\"') + '"]';
        if (safeQuery(sel).length === 1) return sel;
      }
    }
    // Fallback: :nth-of-type path up to nearest ID ancestor (or body)
    var path = [];
    var node = el;
    while (node && node.nodeType === 1 && node !== document.body) {
      var step = node.tagName.toLowerCase();
      var parent = node.parentElement;
      if (parent) {
        var siblings = Array.from(parent.children).filter(function (c) {
          return c.tagName === node.tagName;
        });
        if (siblings.length > 1) {
          var idx = siblings.indexOf(node) + 1;
          step += ":nth-of-type(" + idx + ")";
        }
      }
      if (node.id) {
        path.unshift("#" + node.id);
        break;
      }
      path.unshift(step);
      node = parent;
    }
    return path.join(" > ");
  }

  function cssEscape(s) {
    if (window.CSS && window.CSS.escape) return window.CSS.escape(s);
    return String(s).replace(/[^a-zA-Z0-9_-]/g, "\\\\$&");
  }

  function safeQuery(sel) {
    try { return document.querySelectorAll(sel); } catch (e) { return []; }
  }

  function onMove(e) {
    if (e.shiftKey) return;
    var t = e.target;
    if (!t || isInPanel(t)) return;
    if (t === lastHl) return;
    highlight(t);
    var sel = genSelector(t);
    out.textContent = sel || "(unable to derive)";
    currentSelector = sel;
    copyBtn.disabled = !sel;
  }

  function onClick(e) {
    var t = e.target;
    if (isInPanel(t)) return;
    e.preventDefault();
    e.stopPropagation();
    var sel = genSelector(t);
    currentSelector = sel;
    out.textContent = sel || "(unable to derive)";
    copyBtn.disabled = !sel;
    highlight(t);
  }

  function onKey(e) {
    if (e.key === "Escape") teardown();
  }

  function copySelector() {
    if (!currentSelector) return;
    try {
      navigator.clipboard.writeText(currentSelector).then(function () {
        copyBtn.textContent = "Copied!";
        setTimeout(function () { copyBtn.textContent = "Copy"; }, 1200);
      });
    } catch (e) {
      // Fallback: select-the-text trick
      var t = document.createElement("textarea");
      t.value = currentSelector;
      document.body.appendChild(t);
      t.select();
      try { document.execCommand("copy"); } catch (e2) {}
      document.body.removeChild(t);
      copyBtn.textContent = "Copied!";
      setTimeout(function () { copyBtn.textContent = "Copy"; }, 1200);
    }
  }

  function teardown() {
    document.removeEventListener("mousemove", onMove, true);
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("keydown", onKey, true);
    clearHighlight();
    if (panel.parentNode) panel.parentNode.removeChild(panel);
    window.__chapterPickerActive = false;
  }

  copyBtn.addEventListener("click", function (e) { e.stopPropagation(); copySelector(); });
  closeBtn.addEventListener("click", function (e) { e.stopPropagation(); teardown(); });

  document.addEventListener("mousemove", onMove, true);
  document.addEventListener("click", onClick, true);
  document.addEventListener("keydown", onKey, true);
})();
`;
