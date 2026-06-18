"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const CONSENT_KEY = "afg_consent_v1";

declare global {
  interface Window {
    __chapter_afg_custom_bound?: boolean;
    ChapterPixel?: unknown;
  }
}

export default function ChapterLoader() {
  const pathname = usePathname();
  const firstRender = useRef(true);

  // One-time: inject pixel script + bind click handlers. Skipped on the
  // /chapter dashboard surface (internal agency-operator UI).
  useEffect(() => {
    if (pathname?.startsWith("/chapter")) return;
    try {
      if (localStorage.getItem(CONSENT_KEY) === "declined") return;

      // 1. Inject the base pixel once.
      if (!document.querySelector('script[data-chapter-loader="true"]')) {
        const script = document.createElement("script");
        script.src = "/api/chapter/pixel.js";
        script.async = true;
        script.setAttribute("data-chapter-loader", "true");
        script.setAttribute("data-client-key", "adsforgood_prod");
        script.setAttribute("data-vertical", "AFG_SITE");
        document.body.appendChild(script);
      }

      // 2. Bind global click + click_intent + button_click + SMS detection.
      // Idempotent via the __chapter_afg_custom_bound flag so SPA navigations
      // don't double-bind. Uses the ChapterPixel queue fallback — pixel.js will
      // process queued events when it finishes loading.
      if (!window.__chapter_afg_custom_bound) {
        window.__chapter_afg_custom_bound = true;
        const track = (name: string, props: Record<string, unknown>) => {
          try {
            const cp = window.ChapterPixel as
              | { track?: (n: string, p: Record<string, unknown>) => void }
              | Array<[string, string, Record<string, unknown>]>
              | undefined;
            if (cp && typeof (cp as { track?: unknown }).track === "function") {
              (cp as { track: (n: string, p: Record<string, unknown>) => void }).track(name, props);
            } else {
              const queue = (window.ChapterPixel = (window.ChapterPixel || []) as Array<
                [string, string, Record<string, unknown>]
              >);
              queue.push(["track", name, props]);
            }
          } catch {
            /* fail quietly */
          }
        };

        const describe = (el: Element): Record<string, unknown> => {
          const sec = el.closest("section, nav, header, footer, main, aside");
          const cls = typeof (el as HTMLElement).className === "string"
            ? (el as HTMLElement).className
            : null;
          const text = (el as HTMLElement).innerText?.trim().slice(0, 100) || "";
          const aria = el.getAttribute("aria-label");
          return {
            label: text || aria || (el as HTMLElement).id || cls || el.tagName,
            tag: el.tagName,
            href: el.tagName === "A" ? el.getAttribute("href") : null,
            element_id: (el as HTMLElement).id || null,
            element_class: cls,
            aria_label: aria,
            page_section: sec
              ? sec.getAttribute("aria-label") || sec.id || sec.tagName
              : null,
          };
        };

        document.addEventListener(
          "mousedown",
          (e) => {
            const t = e.target as Element | null;
            const el = t?.closest?.("a, button, [role='button']");
            if (!el) return;
            track("click_intent", describe(el));
          },
          true,
        );

        document.addEventListener(
          "click",
          (e) => {
            const t = e.target as Element | null;
            const el = t?.closest?.("a, button, [role='button']");
            if (!el) return;
            const props = describe(el);
            track("click", props);
            if (el.tagName === "BUTTON" || el.getAttribute("role") === "button") {
              track("button_click", props);
            }
            const href = props.href as string | null;
            if (href && /^sms:/i.test(href)) track("open_in_messages", props);
            if (href && /^mailto:/i.test(href)) track("open_in_email", props);
            if (href && /^tel:/i.test(href)) track("open_in_phone", props);
          },
          true,
        );
      }
    } catch {
      /* fail quietly */
    }
  }, [pathname]);

  // SPA route-change page_view re-fire. Skipped on first render (pixel.js
  // already fires page_view on initial load). Also skipped on /chapter
  // dashboard routes.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (pathname?.startsWith("/chapter")) return;
    try {
      const cp = window.ChapterPixel as
        | { track?: (n: string, p: Record<string, unknown>) => void }
        | undefined;
      if (cp && typeof (cp as { track?: unknown }).track === "function") {
        (cp as { track: (n: string, p: Record<string, unknown>) => void }).track(
          "page_view",
          {
            page_title: document.title || null,
            page_type: "site_page",
          },
        );
      }
    } catch {
      /* fail quietly */
    }
  }, [pathname]);

  return null;
}
