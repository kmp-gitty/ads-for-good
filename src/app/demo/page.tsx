"use client";

import { useEffect, useState } from "react";

type Snapshot = {
  ok: boolean;
  client_key: string;
  journey_id: string | null;
  anon_id: string | null;
  journey: any | null;
  events: any[];
  server_time: string;
};

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
                    <div>status: {data.journey?.consent_status ?? "opted-in"}</div>
                    <div>mode: {data.journey?.consent_mode ?? "opt-out"}</div>
                    <div>demo_loaded_at: {loadedAt}</div>
                  </div>

                  <div>
                    <div className="font-semibold">Latest Events</div>
                    <div className="space-y-2 mt-2">
                      {data.events?.map((e, i) => (
                        <div
                          key={i}
                          className="rounded border border-neutral-200 p-2 text-xs"
                        >
                          <div>{e.ts}</div>
                          <div className="font-semibold">
                            {e.event_name}
                          </div>
                          <div>
                            utm_source: {e.utm?.utm_source ?? "direct"}
                          </div>
                          <div>
                            consent: {e.consent_status ?? "null"} /{" "}
                            {e.consent_mode ?? "null"}
                          </div>
                        </div>
                      ))}
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