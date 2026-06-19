"use client";

import { useEffect, useRef } from "react";

// React 19 silently sanitizes `javascript:` URLs in href, so the dragged
// bookmark ends up empty if we set href via JSX. We set it imperatively
// via ref after mount — that bypasses React's attribute pipeline and
// the browser stores the bookmarklet URL correctly when dragged.

const BOOKMARKLET =
  "javascript:(function(){var s=document.createElement('script');s.src='https://ads4good.com/api/internal/picker.js?t='+Date.now();document.body.appendChild(s);})();";

export default function PickerBookmarklet() {
  const ref = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (ref.current) {
      // setAttribute bypasses React's prop sanitization
      ref.current.setAttribute("href", BOOKMARKLET);
    }
  }, []);

  return (
    <a
      ref={ref}
      // No href in JSX — set via ref above. Keep a placeholder so React
      // renders an anchor node we can write into.
      href="#"
      className="inline-block rounded-full bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-600"
      onClick={e => e.preventDefault()}
      draggable
    >
      ⌖ Chapter picker
    </a>
  );
}
