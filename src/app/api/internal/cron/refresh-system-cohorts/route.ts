// Nightly refresh of system cohorts (Email subscribers + value bands) for
// every active client. Posts a GChat alert only on failure (success would
// be daily noise).
//
// Schedule: see vercel.json. Runs alongside the existing dashboard MV
// refresh + attribution cron.

import { NextRequest, NextResponse } from "next/server";
import postgres from "postgres";
import { unauthorizedIfNotCron } from "../../../../lib/monitoring/auth";
import { postToGChat } from "../../../../lib/monitoring/gchat";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const authError = unauthorizedIfNotCron(req);
  if (authError) return authError;

  const directUrl = process.env.DATABASE_DIRECT_URL;
  if (!directUrl) {
    return NextResponse.json({ error: "DATABASE_DIRECT_URL not set" }, { status: 500 });
  }

  const sql = postgres(directUrl, {
    max: 1,
    keep_alive: 60,
    connect_timeout: 30,
  });

  const startedAt = new Date();
  const summary: { client_key: string; cohort_kind: string; n_members: number }[] = [];
  const errors: { client_key: string; error: string }[] = [];

  try {
    await sql`SET statement_timeout = '5min'`;

    // Active clients come from chapter_config.client_secrets — this is the
    // single source of truth for "who's a Chapter client today."
    const clients = await sql<{ client_key: string }[]>`
      SELECT DISTINCT client_key
      FROM chapter_config.client_secrets
      WHERE revoked_at IS NULL
      ORDER BY client_key
    `;

    for (const { client_key } of clients) {
      try {
        const rows = await sql<{ cohort_kind: string; n_members: number }[]>`
          SELECT * FROM chapter_config.refresh_system_cohorts(${client_key})
        `;
        for (const r of rows) {
          summary.push({ client_key, cohort_kind: r.cohort_kind, n_members: Number(r.n_members) });
        }
      } catch (err) {
        errors.push({ client_key, error: err instanceof Error ? err.message : String(err) });
      }
    }
  } finally {
    await sql.end({ timeout: 5 });
  }

  const elapsedSec = Math.round((Date.now() - startedAt.getTime()) / 1000);

  if (errors.length > 0) {
    await postToGChat({
      text:
        `*System cohort refresh — ${errors.length} client(s) failed*\n` +
        errors.map(e => `• \`${e.client_key}\`: ${e.error}`).join("\n") +
        `\n\n_Elapsed: ${elapsedSec}s. ${summary.length} successful cohort writes._`,
    });
  }

  return NextResponse.json({
    ok: errors.length === 0,
    elapsed_sec: elapsedSec,
    refreshed: summary,
    errors,
  });
}
