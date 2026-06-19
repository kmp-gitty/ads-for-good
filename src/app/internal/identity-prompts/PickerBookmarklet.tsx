"use client";

import { useState } from "react";

// React 19 sanitizes `javascript:` URLs anywhere it sees them as an href
// — both in JSX props AND through setAttribute on rendered nodes. The
// only reliable escape is to bypass React entirely and let the browser's
// native HTML parser write the attribute via innerHTML. Browsers do not
// sanitize `javascript:` in href when parsing HTML.

const BOOKMARKLET =
  "javascript:(function(){var s=document.createElement('script');s.src='https://ads4good.com/api/internal/picker.js?t='+Date.now();document.body.appendChild(s);})();";

const ANCHOR_HTML = `<a href="${BOOKMARKLET}" draggable="true" onclick="event.preventDefault()" class="inline-block rounded-full bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 cursor-grab" style="text-decoration:none">⌖ Chapter picker</a>`;

export default function PickerBookmarklet() {
  const [copied, setCopied] = useState(false);

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(BOOKMARKLET);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* noop */
    }
  }

  return (
    <div className="space-y-3">
      <div dangerouslySetInnerHTML={{ __html: ANCHOR_HTML }} />
      <details className="text-xs text-neutral-600">
        <summary className="cursor-pointer text-neutral-700 hover:text-neutral-900">
          Drag not working? Create the bookmark manually.
        </summary>
        <ol className="mt-2 ml-4 list-decimal space-y-1">
          <li>Right-click your bookmarks bar → <strong>Add page…</strong> (or &ldquo;Add bookmark&rdquo;)</li>
          <li>Name: <code className="rounded bg-neutral-100 px-1">Chapter picker</code></li>
          <li>URL: paste the code below</li>
        </ol>
        <div className="mt-2 flex items-start gap-2">
          <textarea
            readOnly
            value={BOOKMARKLET}
            className="flex-1 font-mono text-[11px] p-2 border border-neutral-300 rounded bg-white"
            rows={3}
            onClick={e => (e.target as HTMLTextAreaElement).select()}
          />
          <button
            type="button"
            onClick={copyUrl}
            className="rounded-md bg-neutral-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-neutral-700"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </details>
    </div>
  );
}
