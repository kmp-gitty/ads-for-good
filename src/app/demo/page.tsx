"use client";

// Chapter Moment Identity — Practice + Sales Demo Playground.
//
// This page provides target elements for all 6 MI v2 presets (Email Exchange,
// Custom Form, Custom Notification, Make an Offer, Phone Call, Remind Me).
// The Chapter pixel loads globally via ChapterLoader with client_key=
// adsforgood_prod, so any prompt authored under that tenant at
// /internal/identity-prompts/adsforgood_prod will fire when its trigger
// matches an element on this page.
//
// Two use cases:
//  1) Operator practice — author a prompt at /internal/identity-prompts/...,
//     then come here and click the matching trigger button to see it render
//     against a real DOM without embedding on a real client's storefront.
//  2) Sales demo — walk a prospect through each preset by clicking the
//     triggers in order, showing the modal + the live event feed below.
//
// Live event feed reuses /demo/snapshot (existing route).

import { useEffect, useState } from "react";

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

type Preset = {
  id: string;
  name: string;
  description: string;
  cssClass: string;
  triggerLabel: string;
  presetType: string;
  phase: number;
  available: boolean;
  configHints: string[];
  extraNotes?: string;
};

const PRESETS: Preset[] = [
  {
    id: "email_exchange",
    name: "Email Exchange",
    description:
      "The classic newsletter / offer-code modal. Visitor enters an email or phone, gets a discount code back.",
    cssClass: "demo-email-exchange",
    triggerLabel: "Fire Email Exchange modal",
    presetType: "email_exchange",
    phase: 1,
    available: true,
    configHints: [
      "slug: demo_email_exchange",
      "trigger type: Click element",
      "CSS selector: .demo-email-exchange",
      "input mode: email (or either)",
      "post-submit action: message (or email with offer)",
      "frequency: every_visit",
    ],
  },
  {
    id: "custom_form",
    name: "Custom Form",
    description:
      "Multi-field lead capture. Single-page variant — email + role dropdown + notes textarea.",
    cssClass: "demo-custom-form",
    triggerLabel: "Fire Custom Form (single-page)",
    presetType: "custom_form",
    phase: 2,
    available: true,
    configHints: [
      "slug: demo_custom_form",
      "trigger type: Click element",
      "CSS selector: .demo-custom-form",
      "add content blocks (headline, body) + form fields",
    ],
  },
  {
    id: "custom_form_multipage",
    name: "Custom Form (multi-page)",
    description:
      "Multi-page form with conditional branching. Page 1 asks role → routes Founders to a company-stage question, everyone else to a problem-fit question. Same preset type, richer configuration.",
    cssClass: "demo-custom-form-multipage",
    triggerLabel: "Fire multi-page Custom Form",
    presetType: "custom_form",
    phase: 2,
    available: true,
    configHints: [
      "slug: demo_custom_form_multipage",
      "trigger type: Click element",
      "CSS selector: .demo-custom-form-multipage",
      "toggle Multi-page form on the admin form",
      "Page 1: single_choice field 'role' with 4 options",
      "Branching: role=Founder → founder_track; else → generic_track",
    ],
    extraNotes:
      "The progress dots + Back button are shown; visitor's entered values persist across page transitions. Identity email captured on final submit.",
  },
  {
    id: "custom_notification",
    name: "Custom Notification",
    description:
      "Corner-bubble notification (Intercom-style). Yes/no, single CTA, or dismiss-only.",
    cssClass: "demo-notification",
    triggerLabel: "Show corner-bubble notification",
    presetType: "custom_notification",
    phase: 4,
    available: true,
    configHints: [
      "slug: demo_notification",
      "trigger type: Click element",
      "CSS selector: .demo-notification",
      "position: bottom-right",
      "CTA type: dismiss_only / button / yes_no",
    ],
    extraNotes: "The bubble slides in from the corner and stays until dismissed.",
  },
  {
    id: "make_an_offer",
    name: "Make an Offer",
    description:
      "Cart-recovery bidding. Visitor names a price → auto-accept / counter / decline based on operator-configured thresholds.",
    cssClass: "demo-make-offer",
    triggerLabel: "Make an offer on the demo hoodie",
    presetType: "make_an_offer",
    phase: 5,
    available: true,
    configHints: [
      "slug: demo_make_offer",
      "trigger type: Click element",
      "CSS selector: .demo-make-offer",
      "target: Product",
      "product_id: mock-hoodie-001",
      "product_name: Chapter Demo Hoodie",
      "list_price: 89.00",
      "Also configure a threshold at /internal/identity-prompts/adsforgood_prod/offer-thresholds",
    ],
    extraNotes:
      "Live thresholds seeded: global 85% + product mock-hoodie-001 at 60% / $60 floor. Bid $60+ → auto-accept + real CHAPTER-XXXXXXXX code via shopify-mock. Bid $53-59 → counter-offer. Bid <$53 → decline. Change thresholds at Offer thresholds → to test other paths.",
  },
  {
    id: "phone_call",
    name: "Phone Call",
    description: "CTA-only click-to-call. No identity capture, analytics-only.",
    cssClass: "demo-phone-call",
    triggerLabel: "Show phone-call CTAs",
    presetType: "phone_call",
    phase: 4,
    available: true,
    configHints: [
      "slug: demo_phone_call",
      "trigger type: Click element",
      "CSS selector: .demo-phone-call",
      "add content blocks + phone CTAs (label + phone number)",
    ],
  },
  {
    id: "remind_me",
    name: "Remind Me",
    description:
      "Persistent subscription for price drops / back-in-stock notifications. Ships in Phase 6.",
    cssClass: "demo-remind-me",
    triggerLabel: "Coming in Phase 6",
    presetType: "remind_me",
    phase: 6,
    available: false,
    configHints: [],
  },
];

export default function DemoPage() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedPaused, setFeedPaused] = useState(false);

  const clientKey = "adsforgood_prod";

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (feedPaused) return;

    const fetchSnapshot = async () => {
      try {
        const res = await fetch(
          `/demo/snapshot?client_key=${clientKey}&_t=${Date.now()}`,
          { cache: "no-store", credentials: "include" },
        );
        const json = await res.json();
        if (!res.ok) {
          setError(json?.error || "snapshot_error");
          return;
        }
        setError(null);
        setData(json);
      } catch (e) {
        setError(e instanceof Error ? e.message : "network_error");
      }
    };

    fetchSnapshot();
    timer = setInterval(fetchSnapshot, 2000);
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [feedPaused]);

  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-6xl px-4 py-10">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
            Chapter Moment Identity Playground
          </h1>
          <p className="mt-3 max-w-3xl text-sm text-neutral-600">
            All 6 preset types with target triggers. Author a prompt under the{" "}
            <span className="font-mono font-semibold text-orange-700">
              adsforgood_prod
            </span>{" "}
            tenant with a matching click-element trigger, then click the button
            here to see it fire. Live event feed at the bottom shows what the
            pixel is capturing.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <a
              href="/internal/identity-prompts/adsforgood_prod"
              className="rounded-md border border-orange-300 bg-white px-4 py-2 font-semibold text-orange-700 hover:bg-orange-50"
            >
              → Configure prompts
            </a>
            <a
              href="/internal/identity-prompts/adsforgood_prod/offers"
              className="rounded-md border border-neutral-300 bg-white px-4 py-2 font-semibold text-neutral-700 hover:bg-neutral-50"
            >
              → Offers review queue
            </a>
            <a
              href="/internal/identity-prompts/adsforgood_prod/offer-thresholds"
              className="rounded-md border border-neutral-300 bg-white px-4 py-2 font-semibold text-neutral-700 hover:bg-neutral-50"
            >
              → Offer thresholds
            </a>
            <a
              href="/internal/identity-prompts/adsforgood_prod/templates"
              className="rounded-md border border-neutral-300 bg-white px-4 py-2 font-semibold text-neutral-700 hover:bg-neutral-50"
            >
              → Email templates
            </a>
          </div>
        </header>

        {/* Preset grid */}
        <section className="grid gap-4 md:grid-cols-2">
          {PRESETS.map((preset) => (
            <PresetCard key={preset.id} preset={preset} />
          ))}
        </section>

        {/* Live event feed */}
        <section className="mt-10">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">
                Live pixel event feed
              </h2>
              <p className="text-xs text-neutral-500">
                Latest events for{" "}
                <span className="font-mono">{clientKey}</span> — refreshes every 2s
              </p>
            </div>
            <div className="flex items-center gap-3">
              {error && (
                <span className="text-xs font-semibold text-red-600">
                  {error}
                </span>
              )}
              <button
                onClick={() => setFeedPaused((p) => !p)}
                className="rounded border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                {feedPaused ? "▶ Resume" : "⏸ Pause"}
              </button>
            </div>
          </div>

          {data && (
            <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-4">
              <SessionStat label="anon_id" value={data.anon_id ?? "—"} />
              <SessionStat label="journey_id" value={data.journey_id ?? "—"} />
              <SessionStat
                label="consent"
                value={
                  data.session?.consent_status
                    ? `${data.session.consent_status} / ${data.session.consent_mode ?? "—"}`
                    : "—"
                }
              />
              <SessionStat
                label="events (recent)"
                value={String(data.events?.length ?? 0)}
              />
            </div>
          )}

          <div className="rounded-lg border border-neutral-200 bg-white">
            {!data && <div className="p-4 text-sm text-neutral-500">Loading…</div>}
            {data && (data.events || []).length === 0 && (
              <div className="p-4 text-sm text-neutral-500">
                No events yet. Click a preset trigger above or navigate around
                the site to fire some.
              </div>
            )}
            {data && (data.events || []).length > 0 && (
              <ul className="divide-y divide-neutral-100">
                {(data.events || []).slice(0, 20).map((ev, i) => (
                  <li
                    key={i}
                    className="grid grid-cols-1 gap-1 px-4 py-3 text-xs md:grid-cols-[180px_180px_1fr]"
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

        {/* Footer note */}
        <footer className="mt-10 rounded-lg border border-dashed border-neutral-300 bg-white p-4 text-xs text-neutral-600">
          <p className="font-semibold text-neutral-800">Notes</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            <li>
              Pixel loads automatically via ChapterLoader with{" "}
              <span className="font-mono">client_key=adsforgood_prod</span>. If
              you don&apos;t see events, check that Chapter consent isn&apos;t
              declined in your browser&apos;s localStorage (key{" "}
              <span className="font-mono">afg_consent_v1</span>).
            </li>
            <li>
              For demo purposes, set frequency to{" "}
              <span className="font-mono">every_visit</span> so the prompt fires
              on every click without throttle. Real production prompts should
              use <span className="font-mono">session</span> or{" "}
              <span className="font-mono">visitor</span>.
            </li>
            <li>
              Make-an-Offer demos work end-to-end without a live Shopify store
              via <span className="font-mono">PLATFORM_ADAPTER_MODE=mock</span>{" "}
              (env var). shopify-mock returns realistic{" "}
              <span className="font-mono">CHAPTER-XXXXXXXX</span> codes.
            </li>
          </ul>
        </footer>
      </div>
    </main>
  );
}

function PresetCard({ preset }: { preset: Preset }) {
  const isPhase6 = !preset.available;
  return (
    <article
      className={
        "rounded-lg border p-5 " +
        (isPhase6
          ? "border-neutral-200 bg-neutral-50"
          : "border-neutral-200 bg-white shadow-sm")
      }
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold text-neutral-900">{preset.name}</h3>
        <span
          className={
            "rounded px-2 py-0.5 font-mono text-[10px] font-semibold uppercase " +
            (isPhase6
              ? "bg-neutral-200 text-neutral-500"
              : "bg-orange-100 text-orange-800")
          }
        >
          Phase {preset.phase} {isPhase6 && "· not shipped"}
        </span>
      </div>

      <p className="text-sm text-neutral-600">{preset.description}</p>

      {preset.extraNotes && (
        <p className="mt-2 text-xs italic text-neutral-500">
          {preset.extraNotes}
        </p>
      )}

      {preset.available ? (
        <>
          <div className="mt-4">
            <button
              className={`${preset.cssClass} rounded-md bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600`}
              type="button"
            >
              {preset.triggerLabel}
            </button>
          </div>

          <details className="mt-4 rounded-md border border-neutral-200 bg-neutral-50 p-3">
            <summary className="cursor-pointer text-xs font-semibold text-neutral-700">
              Configuration hints
            </summary>
            <ul className="mt-2 space-y-1 pl-4 text-xs text-neutral-600">
              {preset.configHints.map((h, i) => (
                <li key={i} className="list-disc font-mono">
                  {h}
                </li>
              ))}
            </ul>
          </details>
        </>
      ) : (
        <div className="mt-4 rounded-md border border-dashed border-neutral-300 bg-white p-3 text-xs text-neutral-500">
          Ships in Phase 6 — subscription-monitor + hourly evaluation cron +
          inventory/price polling adapter.
        </div>
      )}
    </article>
  );
}

function SessionStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-neutral-200 bg-white p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
        {label}
      </div>
      <div className="mt-1 truncate font-mono text-xs text-neutral-800">
        {value}
      </div>
    </div>
  );
}
