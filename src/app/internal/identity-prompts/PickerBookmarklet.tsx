"use client";

// Drag-target link for the CSS selector picker bookmarklet. The `href`
// is a javascript: URL; the onClick suppresses navigation if the operator
// accidentally clicks the chip in the admin page instead of dragging it
// to their bookmarks bar (clicking would run the picker against the admin
// page itself — harmless but disorienting).

const BOOKMARKLET =
  "javascript:(function(){var s=document.createElement('script');s.src='https://ads4good.com/api/internal/picker.js?t='+Date.now();document.body.appendChild(s);})();";

export default function PickerBookmarklet() {
  return (
    <a
      href={BOOKMARKLET}
      className="inline-block rounded-full bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-600"
      onClick={e => e.preventDefault()}
      draggable
    >
      ⌖ Chapter picker
    </a>
  );
}
