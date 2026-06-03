// Nightly run of the Observations engine for every active client.
// Calls chapter_observations.run_engine(client_key) which dispatches all
// eligible questions (capability + data-depth gated). Posts a GChat alert
// only on failure.

import { NextRequest, NextResponse } from "next/server";
import postgres from "postgres";
import { unauthorizedIfNotCron } from "../../../../lib/monitoring/auth";
import { postToGChat } from "../../../../lib/monitoring/gchat";

export const dynamic = "force-dynamic";
export const maxDuration = 600;

export async function GET(req: NextRequest) {
  const authError = unauthorizedIfNotCron(req);
  if (authError) return authError;

  const directUrl = process.env.DATABASE_DIRECT_URL;
  if (!directUrl) {
    return NextResponse.json({ error: "DATABASE_DIRECT_URL not set" }, { status: 500 });
  }

  const sql = postgres(directUrl, { max: 1, keep_alive: 60, connect_timeout: 30 });
  const startedAt = new Date();
  const summary: { client_key: string; run_id: string; questions_executed: number; findings: number }[] = [];
  const errors:  { client_key: string; error: string }[] = [];

  try {
    await sql`SET statement_timeout = '10min'`;

    const clients = await sql<{ client_key: string }[]>`
      SELECT DISTINCT client_key FROM chapter_config.client_secrets
      WHERE revoked_at IS NULL ORDER BY client_key
    `;

    for (const { client_key } of clients) {
      try {
        const [{ run_id }] = await sql<{ run_id: string }[]>`
          SELECT chapter_observations.run_engine(${client_key}) AS run_id
        `;
        const [counts] = await sql<{ questions_executed: number; findings: number }[]>`
          SELECT questions_executed, findings_produced AS findings
          FROM chapter_observations.runs WHERE run_id = ${run_id}
        `;
        summary.push({
          client_key,
          run_id,
          questions_executed: Number(counts?.questions_executed ?? 0),
          findings:           Number(counts?.findings ?? 0),
        });
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
        `*Observations engine — ${errors.length} client(s) failed*\n` +
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
