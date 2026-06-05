// Nightly refresh of the per-client attribution chain:
//   lifecycle_chapters_snapshot → canonical_v1_snapshot → canonical_v2_snapshot
// All three stages run in one SQL call per client via
// chapter_reporting.refresh_full_attribution_chain(client_key). Posts a
// GChat alert only on failure.

import { NextRequest, NextResponse } from "next/server";
import postgres from "postgres";
import { unauthorizedIfNotCron } from "../../../../lib/monitoring/auth";
import { postToGChat } from "../../../../lib/monitoring/gchat";

export const dynamic = "force-dynamic";
export const maxDuration = 600;

type StageRow = {
  client_key: string;
  snapshot_ts_hi: string;
  lifecycle_inserted: string;
  lifecycle_remaining: boolean;
  canonical_v1_inserted: string;
  canonical_v2_inserted: string;
  total_elapsed: string;
};

export async function GET(req: NextRequest) {
  const authError = unauthorizedIfNotCron(req);
  if (authError) return authError;

  const directUrl = process.env.DATABASE_DIRECT_URL;
  if (!directUrl) {
    return NextResponse.json({ error: "DATABASE_DIRECT_URL not set" }, { status: 500 });
  }

  const sql = postgres(directUrl, { max: 1, keep_alive: 60, connect_timeout: 30 });
  const startedAt = new Date();
  const summary: StageRow[] = [];
  const errors: { client_key: string; error: string }[] = [];

  try {
    await sql`SET statement_timeout = '30min'`;

    const clients = await sql<{ client_key: string }[]>`
      SELECT DISTINCT client_key FROM chapter_config.client_secrets
      WHERE revoked_at IS NULL ORDER BY client_key
    `;

    for (const { client_key } of clients) {
      try {
        const [row] = await sql<StageRow[]>`
          SELECT * FROM chapter_reporting.refresh_full_attribution_chain(${client_key})
        `;
        summary.push(row);
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
        `*Attribution chain refresh — ${errors.length} client(s) failed*\n` +
        errors.map(e => `• \`${e.client_key}\`: ${e.error}`).join("\n") +
        `\n\n_Elapsed: ${elapsedSec}s. ${summary.length} clients ran successfully._`,
    });
  }

  return NextResponse.json({
    ok: errors.length === 0,
    elapsed_sec: elapsedSec,
    runs: summary,
    errors,
  });
}
