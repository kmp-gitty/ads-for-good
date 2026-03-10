"use client";

import { useEffect, useState } from "react";

type Snapshot = {
    ok: boolean;
    client_key: string;
    journey_id: string | null;
    anon_id: string | null;
    session?: any;
    events: Array<{
      ts: string;
      event_name: string;
      page_path?: string | null;
      utm_source?: string | null;
      utm_medium?: string | null;
      consent_status?: string | null;
      consent_mode?: string | null;
    }>;
    server_time: string;
    dashboard_json?: any;
    dashboard_error?: string | null;
  };

  function buildReplay(events: Snapshot["events"]) {
    // events arrive DESC from server; we want ASC for a readable replay
    const asc = [...(events || [])].reverse();
  
    // Build compact tokens like "google", "reddit", "(direct)" + boundary events
    const tokens: string[] = [];
    for (const e of asc) {
      const ch = e.utm_source || "(direct)";
      const isBoundary =
        e.event_name === "purchase" || e.event_name === "lead" || e.event_name === "identify";
  
      // show boundary events explicitly; otherwise just channel
      const t = isBoundary ? `${ch}:${e.event_name}` : ch;
  
      // de-dupe consecutive repeats
      if (tokens[tokens.length - 1] !== t) tokens.push(t);
    }
  
    return tokens.slice(-20).join(" → "); // keep it short for UI
  }

export default function DemoPage() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadedAt] = useState(() => new Date().toISOString());

  const clientKey = "adsforgood_local";

  useEffect(() => {
    let timer: any;

    const fetchSnapshot = async () => {
      try {
        const res = await fetch(
            `/demo/snapshot?client_key=${clientKey}&_t=${Date.now()}`,
          {
            cache: "no-store",
            credentials: "include",
          }
        );

        const json = await res.json();

        if (!res.ok) {
          setError(json?.error || "snapshot_error");
          return;
        }

        setData(json);
      } catch (e: any) {
        setError(e?.message || "network_error");
      }
    };

    fetchSnapshot();
    timer = setInterval(fetchSnapshot, 1500);

    return () => clearInterval(timer);
  }, []);

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-[1400px] px-4 py-4">
        <h1 className="text-xl font-semibold text-neutral-900">
          Unified Pixel Live Demo
        </h1>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {/* LEFT SIDE */}
          <section className="rounded-lg border border-neutral-200 overflow-hidden">
            <div className="border-b border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-700">
              Demo Site (/faux-news)
            </div>

            <iframe
              src="/faux-news?utm_source=google&utm_medium=cpc&utm_campaign=demo"
              className="h-[80vh] w-full"
              title="Demo Site"
            />
          </section>

          {/* RIGHT SIDE */}
          <section className="rounded-lg border border-neutral-200 overflow-hidden">
            <div className="border-b border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-700">
              Live Debug
            </div>

            <div className="p-4 text-sm text-neutral-800">
              {error && (
                <div className="text-red-600 mb-2">Error: {error}</div>
              )}

              {!data && <div>Loading...</div>}

              {data && (
                <div className="space-y-4">
                  <div>
                    <div className="font-semibold">Session</div>
                    <div>journey_id: {data.journey_id}</div>
                    <div>anon_id: {data.anon_id}</div>
                  </div>

                  <div>
                    <div className="font-semibold">Consent</div>
                    <div>status: {data.session?.consent_status ?? "opted-in"}</div>
                    <div>mode: {data.session?.consent_mode ?? "opt-out"}</div>
                    <div>demo_loaded_at: {loadedAt}</div>
                  </div>

                  <div>
  <div className="font-semibold">Journey Replay</div>
  <div className="mt-2 rounded border border-neutral-200 bg-white p-2 text-xs text-neutral-800">
    {data.events?.length ? buildReplay(data.events) : "—"}
  </div>

  <div className="mt-4 font-semibold">Latest Events</div>
  <div className="space-y-2 mt-2">
    {(data.events || []).map((e, i) => {
      const channel = e.utm_source || "(direct)";
      const medium = e.utm_medium || "—";
      const path = e.page_path || "—";

      return (
        <div
          key={i}
          className="rounded border border-neutral-200 p-2 text-xs text-neutral-800"
        >
          <div className="text-neutral-500">{e.ts}</div>

          <div className="mt-1 font-semibold text-neutral-900">{e.event_name}</div>

          <div className="mt-1 text-neutral-800">
            <span className="font-semibold">channel:</span> {channel}{" "}
            <span className="text-neutral-500">/</span>{" "}
            <span className="font-semibold">medium:</span> {medium}
          </div>

          <div className="mt-1 text-neutral-800">
            <span className="font-semibold">path:</span> {path}
          </div>

          <div className="mt-1 text-neutral-700">
            consent: {e.consent_status ?? "null"} / {e.consent_mode ?? "null"}
          </div>
        </div>
      );
    })}
    {(data.events || []).length === 0 ? (
      <div className="text-xs text-neutral-500">No events yet.</div>
    ) : null}
  </div>
</div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}