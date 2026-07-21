"use client";

// Prompt Playground — client component.
//
// Loads the Chapter pixel with client_key=chapter_practice (isolated from
// adsforgood_prod so practice prompts cannot fire on the public site). Renders
// a rich DOM of realistic trigger targets and a sidebar showing every prompt
// authored under chapter_practice with its trigger info + live counters.
//
// The pixel guards against double-loading via window.ChapterPixel.__chapterLoaded,
// and ChapterLoader (the global loader on the marketing site) already skips
// /internal/*, so nothing else will pre-empt our chapter_practice pixel.

import { useEffect, useState } from "react";
import type { PromptRow } from "./page";

const PRACTICE_TENANT = "chapter_practice";

type Snapshot = {
  ok: boolean;
  client_key: string;
  journey_id: string | null;
  anon_id: string | null;
  session?: { consent_status?: string; consent_mode?: string };
  events: Array<{
    ts: string;
    event_name: string;
    page_path?: string | null;
    utm_source?: string | null;
    utm_medium?: string | null;
  }>;
  server_time: string;
};

function describeTrigger(t: PromptRow["trigger_jsonb"]): string {
  switch (t.type) {
    case "click_element":
      return `Click on ${t.selector}`;
    case "exit_intent":
      return "Exit intent";
    case "time_on_page":
      return `After ${(t.delay_ms ?? 15000) / 1000}s on page`;
    case "scroll_depth":
      return `After ${t.percent ?? 50}% scroll`;
    default:
      return JSON.stringify(t);
  }
}

const PRESET_LABEL: Record<string, string> = {
  email_exchange: "Email Exchange",
  custom_form: "Custom Form",
  custom_notification: "Custom Notification",
  make_an_offer: "Make an Offer",
  phone_call: "Phone Call",
  remind_me: "Remind Me",
};

export default function PlaygroundClient({ promptList }: { promptList: PromptRow[] }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);
  const [feedPaused, setFeedPaused] = useState(false);
  const [resetToast, setResetToast] = useState<string | null>(null);

  // Load the chapter_practice pixel once on mount. ChapterLoader skips /internal/*
  // so nothing else will inject a pixel here. Idempotent via the pixel's own
  // window.ChapterPixel.__chapterLoaded guard.
  useEffect(() => {
    if (document.querySelector('script[data-playground-pixel="true"]')) return;
    const script = document.createElement("script");
    script.src = "/api/chapter/pixel.js";
    script.async = true;
    script.setAttribute("data-playground-pixel", "true");
    script.setAttribute("data-client-key", PRACTICE_TENANT);
    document.body.appendChild(script);
  }, []);

  // Poll /demo/snapshot for the live event feed. Route is generic across
  // client_keys — we pass chapter_practice explicitly.
  useEffect(() => {
    if (feedPaused) return;
    let cancelled = false;

    const fetchSnapshot = async () => {
      try {
        const res = await fetch(
          `/demo/snapshot?client_key=${PRACTICE_TENANT}&_t=${Date.now()}`,
          { cache: "no-store", credentials: "include" },
        );
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setSnapshotError(json?.error || "snapshot_error");
          return;
        }
        setSnapshotError(null);
        setSnapshot(json);
      } catch (e) {
        if (cancelled) return;
        setSnapshotError(e instanceof Error ? e.message : "network_error");
      }
    };

    fetchSnapshot();
    const timer = setInterval(fetchSnapshot, 2000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [feedPaused]);

  const clearFrequencyCaps = () => {
    try {
      // Pixel throttles prompts via localStorage (`visitor` frequency) and
      // sessionStorage (`session` frequency), keyed by "chapter_prompt_shown_*"
      // and "chapter_prompt_last_shown_*". Wipe every key with that prefix so
      // the next visit / click re-fires the prompt cleanly.
      const wipeStore = (store: Storage) => {
        const toRemove: string[] = [];
        for (let i = 0; i < store.length; i++) {
          const k = store.key(i);
          if (k && (k.startsWith("chapter_prompt_") || k.startsWith("chapter_"))) {
            toRemove.push(k);
          }
        }
        toRemove.forEach((k) => store.removeItem(k));
        return toRemove.length;
      };
      const localCount = wipeStore(localStorage);
      const sessionCount = wipeStore(sessionStorage);
      setResetToast(`Cleared ${localCount + sessionCount} pixel storage keys. Reload page to re-arm triggers.`);
      setTimeout(() => setResetToast(null), 4000);
    } catch (e) {
      setResetToast(`Reset failed: ${e instanceof Error ? e.message : "unknown"}`);
      setTimeout(() => setResetToast(null), 4000);
    }
  };

  const enabledPrompts = promptList.filter((p) => p.enabled);
  const disabledPrompts = promptList.filter((p) => !p.enabled);

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      {/* Sidebar: prompt inventory + reset button */}
      <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
              Live prompts
            </h2>
            <span className="rounded bg-orange-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-orange-800">
              {enabledPrompts.length} on / {promptList.length}
            </span>
          </div>

          {enabledPrompts.length === 0 && (
            <p className="text-xs text-neutral-500">No enabled prompts yet.</p>
          )}

          <ul className="space-y-3">
            {enabledPrompts.map((p) => (
              <PromptCard key={p.id} prompt={p} />
            ))}
          </ul>

          {disabledPrompts.length > 0 && (
            <details className="mt-4 border-t border-neutral-100 pt-3">
              <summary className="cursor-pointer text-xs font-semibold text-neutral-500">
                {disabledPrompts.length} disabled
              </summary>
              <ul className="mt-2 space-y-2">
                {disabledPrompts.map((p) => (
                  <li
                    key={p.id}
                    className="rounded border border-dashed border-neutral-200 p-2 text-xs text-neutral-500"
                  >
                    <span className="font-mono">{p.slug}</span> · {p.preset_type}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-neutral-900">Frequency cache</h3>
          <p className="mt-1 text-xs text-neutral-500">
            Prompts throttled by <span className="font-mono">session</span> or{" "}
            <span className="font-mono">visitor</span> frequency won&apos;t
            re-fire until this browser&apos;s cache expires. Reset to iterate
            without waiting.
          </p>
          <button
            onClick={clearFrequencyCaps}
            className="mt-3 w-full rounded-md border border-orange-300 bg-white px-3 py-2 text-xs font-semibold text-orange-700 hover:bg-orange-50"
          >
            Reset frequency caps
          </button>
          {resetToast && (
            <p className="mt-2 text-[11px] text-neutral-600">{resetToast}</p>
          )}
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-neutral-900">Session</h3>
          <dl className="mt-2 space-y-1 text-[11px]">
            <div className="flex justify-between gap-2">
              <dt className="font-semibold text-neutral-500">tenant</dt>
              <dd className="font-mono truncate text-orange-700">
                {PRACTICE_TENANT}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="font-semibold text-neutral-500">anon_id</dt>
              <dd className="font-mono truncate text-neutral-800">
                {snapshot?.anon_id?.slice(0, 12) ?? "—"}
                {snapshot?.anon_id ? "…" : ""}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="font-semibold text-neutral-500">journey_id</dt>
              <dd className="font-mono truncate text-neutral-800">
                {snapshot?.journey_id?.slice(0, 12) ?? "—"}
                {snapshot?.journey_id ? "…" : ""}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="font-semibold text-neutral-500">consent</dt>
              <dd className="font-mono truncate text-neutral-800">
                {snapshot?.session?.consent_status ?? "—"}
              </dd>
            </div>
          </dl>
        </div>
      </aside>

      {/* Main: Rich DOM + live feed */}
      <div className="space-y-6">
        <RichDom />

        {/* Live event feed */}
        <section className="rounded-lg border border-neutral-200 bg-white">
          <header className="flex items-center justify-between border-b border-neutral-100 p-4">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">
                Live pixel event feed
              </h2>
              <p className="text-[11px] text-neutral-500">
                <span className="font-mono">{PRACTICE_TENANT}</span> · refreshes every 2s
              </p>
            </div>
            <div className="flex items-center gap-3">
              {snapshotError && (
                <span className="text-[11px] font-semibold text-red-600">
                  {snapshotError}
                </span>
              )}
              <button
                onClick={() => setFeedPaused((p) => !p)}
                className="rounded border border-neutral-300 bg-white px-3 py-1 text-[11px] font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                {feedPaused ? "▶ Resume" : "⏸ Pause"}
              </button>
            </div>
          </header>

          <div>
            {!snapshot && (
              <div className="p-4 text-xs text-neutral-500">Loading…</div>
            )}
            {snapshot && (snapshot.events || []).length === 0 && (
              <div className="p-4 text-xs text-neutral-500">
                No events yet. Interact with the DOM above to fire some, or
                configure a prompt targeting one of the labeled elements.
              </div>
            )}
            {snapshot && (snapshot.events || []).length > 0 && (
              <ul className="divide-y divide-neutral-100 text-[11px]">
                {(snapshot.events || []).slice(0, 30).map((ev, i) => (
                  <li
                    key={i}
                    className="grid grid-cols-1 gap-1 px-4 py-2 md:grid-cols-[160px_180px_1fr]"
                  >
                    <span className="font-mono text-neutral-500">
                      {new Date(ev.ts).toLocaleTimeString()}
                    </span>
                    <span className="font-semibold text-neutral-900">
                      {ev.event_name}
                    </span>
                    <span className="truncate text-neutral-600">
                      {ev.page_path ?? "—"}
                      {ev.utm_source && (
                        <span className="ml-2 rounded bg-orange-50 px-1.5 py-0.5 font-mono text-[10px] text-orange-700">
                          {ev.utm_source}
                          {ev.utm_medium ? `/${ev.utm_medium}` : ""}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function PromptCard({ prompt }: { prompt: PromptRow }) {
  return (
    <li className="rounded border border-neutral-200 p-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-xs font-semibold text-neutral-900">
            {prompt.slug}
          </p>
          <p className="text-[11px] text-neutral-500">
            {PRESET_LABEL[prompt.preset_type] ?? prompt.preset_type}
          </p>
        </div>
        <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-emerald-800">
          ON
        </span>
      </div>
      <p className="mt-2 text-[11px] text-neutral-700">
        {describeTrigger(prompt.trigger_jsonb)}
      </p>
      <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-neutral-500">
        <span>freq: <span className="font-mono">{prompt.frequency}</span></span>
        <span>· {prompt.hit_count} shown / {prompt.submit_count} submitted</span>
      </div>
    </li>
  );
}

// Rich DOM — a "kitchen sink" of realistic trigger targets so any reasonable
// CSS selector or trigger type (click_element / exit_intent / time_on_page /
// scroll_depth) can find something to bind to.
//
// Naming convention: `.nav-*` / `.hero-*` / `.product-*` / `.form-*` / `.footer-*`
// so selectors are easy to guess. Buttons carry both class + data-attribute
// options so operators can target either way.
function RichDom() {
  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between border-b border-dashed border-neutral-200 pb-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
          Practice DOM · a labeled kitchen sink for your selectors
        </p>
        <p className="font-mono text-[10px] text-neutral-400">
          view source · every element is labeled
        </p>
      </div>

      {/* Fake site nav */}
      <nav aria-label="playground-nav" className="mb-6 flex items-center justify-between rounded bg-neutral-900 px-4 py-3 text-white">
        <span className="text-sm font-semibold">Practice Shop</span>
        <div className="flex gap-4 text-xs">
          <a href="#" className="nav-link nav-link-shop hover:text-orange-300">Shop</a>
          <a href="#" className="nav-link nav-link-collections hover:text-orange-300">Collections</a>
          <a href="#" className="nav-link nav-link-about hover:text-orange-300">About</a>
          <a href="#" className="nav-link nav-link-account hover:text-orange-300">Account</a>
          <a href="#" className="nav-link nav-link-cart hover:text-orange-300">Cart (0)</a>
        </div>
      </nav>

      {/* Hero */}
      <section aria-label="playground-hero" className="mb-6 rounded bg-gradient-to-br from-orange-100 to-orange-50 p-6">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-orange-700">
          Hero section
        </p>
        <h2 className="mt-2 text-2xl font-bold text-neutral-900">
          Featured collection
        </h2>
        <p className="mt-2 max-w-md text-sm text-neutral-700">
          A realistic hero block. Bind a prompt to <span className="font-mono">.hero-cta</span> to
          fire it when someone clicks the big primary button.
        </p>
        <button
          id="hero-primary-btn"
          className="hero-cta mt-4 rounded bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
          type="button"
        >
          Shop the collection
        </button>
        <button
          className="hero-secondary ml-2 rounded border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
          type="button"
        >
          Watch the video
        </button>
      </section>

      {/* Book-now CTA (barbershop-style) */}
      <section aria-label="playground-book" className="mb-6 rounded border border-neutral-200 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
          Book-now CTA
        </p>
        <div className="mt-2 flex items-center justify-between gap-4">
          <p className="text-sm text-neutral-700">
            Great for personal-services triggers.{" "}
            <span className="font-mono">.book-now-btn</span> or{" "}
            <span className="font-mono">a[href^=&quot;https://book.&quot;]</span>.
          </p>
          <a
            href="https://book.example.com/mock"
            className="book-now-btn rounded bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-700"
            data-action="book-now"
          >
            Book now
          </a>
        </div>
      </section>

      {/* Product grid */}
      <section aria-label="playground-products" className="mb-6">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
          Product grid · 6 tiles with per-product IDs
        </p>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {[
            { id: "practice-hoodie-001", name: "Practice Hoodie", price: 89 },
            { id: "practice-tee-002", name: "Practice Tee", price: 32 },
            { id: "practice-jacket-003", name: "Practice Jacket", price: 189 },
            { id: "practice-hat-004", name: "Practice Cap", price: 24 },
            { id: "practice-bag-005", name: "Practice Tote", price: 45 },
            { id: "practice-mug-006", name: "Practice Mug", price: 18 },
          ].map((p) => (
            <article
              key={p.id}
              className="product-tile rounded border border-neutral-200 p-3 hover:shadow-sm"
              data-product-id={p.id}
            >
              <div className="mb-2 aspect-square rounded bg-neutral-100" />
              <p className="text-sm font-semibold text-neutral-900">{p.name}</p>
              <p className="text-xs text-neutral-500">${p.price}.00</p>
              <div className="mt-2 flex gap-2">
                <button
                  className="product-add-to-cart flex-1 rounded bg-orange-500 px-3 py-1 text-xs font-semibold text-white hover:bg-orange-600"
                  type="button"
                  data-product-id={p.id}
                  data-product-name={p.name}
                  data-product-price={p.price}
                >
                  Add to cart
                </button>
                <button
                  className="product-quick-view rounded border border-neutral-300 bg-white px-3 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                  type="button"
                  data-product-id={p.id}
                >
                  Quick view
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Mock cart */}
      <section aria-label="playground-cart" className="mb-6 rounded border border-neutral-200 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
          Mock cart
        </p>
        <div className="mt-2 flex items-center justify-between gap-4">
          <p className="text-sm text-neutral-700">
            <span className="font-mono">.cart-checkout-btn</span> is a common
            trigger for cart-abandonment prompts.
          </p>
          <button
            className="cart-checkout-btn rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            type="button"
          >
            Checkout
          </button>
        </div>
      </section>

      {/* Signup form */}
      <section aria-label="playground-signup" className="mb-6 rounded border border-neutral-200 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
          Newsletter signup form
        </p>
        <form
          id="playground-signup"
          className="form-signup mt-2 flex gap-2"
          onSubmit={(e) => e.preventDefault()}
        >
          <input
            type="email"
            className="flex-1 rounded border border-neutral-300 px-3 py-2 text-sm"
            placeholder="you@example.com"
          />
          <button
            type="submit"
            className="form-signup-submit rounded bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-700"
          >
            Subscribe
          </button>
        </form>
      </section>

      {/* Contact form */}
      <section aria-label="playground-contact" className="mb-6 rounded border border-neutral-200 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
          Contact form
        </p>
        <form
          id="playground-contact"
          className="form-contact mt-2 space-y-2"
          onSubmit={(e) => e.preventDefault()}
        >
          <input
            type="text"
            className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
            placeholder="Name"
          />
          <input
            type="email"
            className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
            placeholder="Email"
          />
          <textarea
            className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
            rows={3}
            placeholder="Message"
          />
          <button
            type="submit"
            className="form-contact-submit rounded bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-700"
          >
            Send message
          </button>
        </form>
      </section>

      {/* Footer */}
      <footer aria-label="playground-footer" className="mt-6 border-t border-neutral-200 pt-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
          Footer
        </p>
        <div className="mt-2 flex flex-wrap gap-4 text-xs text-neutral-600">
          <a href="#" className="footer-link footer-link-privacy hover:text-neutral-900">Privacy</a>
          <a href="#" className="footer-link footer-link-terms hover:text-neutral-900">Terms</a>
          <a href="#" className="footer-link footer-link-support hover:text-neutral-900">Support</a>
          <a href="sms:+15551234567" className="footer-link footer-link-sms hover:text-neutral-900">Text us</a>
          <a href="tel:+15551234567" className="footer-link footer-link-phone hover:text-neutral-900">Call us</a>
          <a href="mailto:hello@example.com" className="footer-link footer-link-email hover:text-neutral-900">Email us</a>
        </div>
      </footer>
    </section>
  );
}
