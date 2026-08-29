import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Public, uncached liveness probe for an EXTERNAL uptime monitor (UptimeRobot /
// Better Stack). This is the only layer that survives the case where everything
// is down — including the things that send our other alerts.
//
// Design (per the Aug 28 outage post-mortem):
//   - REAL DB round-trip (health_ping = `select 1`), NOT a process-alive 200.
//     Vercel would have happily served a static 200 through the entire outage —
//     the functions were fine, the database under them was not.
//   - Points at the PRIMARY (SUPABASE_URL) — that's what ingest depends on.
//   - Its OWN 2s timeout via AbortController, so a hung connection returns 503
//     fast instead of leaving the monitor (and this function) waiting.
//   - Module-level client + PostgREST's pooled connection — does NOT open a
//     fresh pooled connection per request, so polling every 60s adds ~nothing.
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TIMEOUT_MS = 2000;

export async function GET() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const { error } = await supabase
      .rpc("health_ping")
      .abortSignal(controller.signal);
    clearTimeout(timer);

    if (error) {
      return NextResponse.json(
        { ok: false, db: "error", detail: error.message },
        { status: 503, headers: { "Cache-Control": "no-store" } }
      );
    }
    return NextResponse.json(
      { ok: true, db: "up" },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: unknown) {
    clearTimeout(timer);
    const aborted = e instanceof Error && e.name === "AbortError";
    return NextResponse.json(
      { ok: false, db: aborted ? "timeout" : "unreachable" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
