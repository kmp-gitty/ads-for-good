// Post-webhook probabilistic time-window matcher for anonymous → identified
// stitching. Given a Square booking that just landed, look for recent
// redirect_click events targeting book.squareup.com from anonymous_id
// identities on the same client. If a candidate falls within a small time
// window preceding the booking's timestamp, insert an alias edge from the
// anonymous_id to the target identified key (typically square_customer_id).
// The canon-sync trigger (trg_sync_canon_from_alias) propagates the merge
// automatically → the anonymous browser session's canonical becomes the
// same canonical as the identified customer's canonical (email_sha256).
//
// Confidence heuristic:
//   0 candidates     → no stitch
//   1 candidate      → confidence=80 (high)
//   N > 1 candidates → nearest-in-time wins, confidence=50 (medium)
//
// Fire-and-forget: never throws. Errors log to server console and return
// { matched: false, reason: 'error' }.

import { withClient } from "@/app/lib/db/per-client";

const DEFAULT_WINDOW_MINUTES = 30;
const CONFIDENCE_HIGH = 80;
const CONFIDENCE_MEDIUM = 50;

export interface ProbabilisticStitchInput {
  client_key: string;
  booking_id: string;
  /** ISO 8601 timestamp — when the booking was created (not when service starts) */
  booking_created_at: string;
  /**
   * Target identity to alias the anonymous_id to. Typically
   * 'square_customer_id:<id>' — the canon trigger walks to the email_sha256
   * canonical automatically. Alternatively pass 'email_sha256:<hash>' if
   * the caller has already computed it.
   */
  target_identity_key: string;
}

export interface ProbabilisticStitchResult {
  matched: boolean;
  confidence?: number;
  from_identity_key?: string;
  click_ts?: string;
  candidates_count?: number;
  reason?:
    | "no_pre_click_observed"
    | "target_identity_missing"
    | "error";
}

interface Candidate {
  ts: string;
  identity_key: string;
  journey_id: string | null;
}

export async function attemptProbabilisticStitch({
  client_key,
  booking_id,
  booking_created_at,
  target_identity_key,
}: ProbabilisticStitchInput): Promise<ProbabilisticStitchResult> {
  if (!target_identity_key) {
    return { matched: false, reason: "target_identity_missing" };
  }
  const windowMinutes = DEFAULT_WINDOW_MINUTES;

  try {
    return await withClient(client_key, async (tx) => {
      const candidates = await tx<Candidate[]>`
        SELECT ts::text, identity_key, journey_id::text
        FROM chapter_ingest.pixel_events
        WHERE client_key = ${client_key}
          AND event_name = 'redirect_click'
          AND ts >= (${booking_created_at}::timestamptz - make_interval(mins => ${windowMinutes}))
          AND ts <  ${booking_created_at}::timestamptz
          AND identity_key LIKE 'anonymous_id:%'
          AND (
            props->>'destination' ILIKE '%book.squareup.com%'
            OR props->'full_query'->>'to' ILIKE '%book.squareup.com%'
          )
        ORDER BY ts DESC
        LIMIT 5
      `;

      if (candidates.length === 0) {
        return {
          matched: false,
          candidates_count: 0,
          reason: "no_pre_click_observed",
        };
      }

      // Nearest-in-time wins (candidates already ORDER BY ts DESC).
      const winner = candidates[0];
      const confidence =
        candidates.length === 1 ? CONFIDENCE_HIGH : CONFIDENCE_MEDIUM;

      const metadata = tx.json({
        booking_id,
        booking_ts: booking_created_at,
        click_ts: winner.ts,
        window_minutes: windowMinutes,
        candidates_count: candidates.length,
        journey_id: winner.journey_id,
      });

      await tx`
        INSERT INTO chapter_identity.identity_aliases
          (client_key, ts, from_identity_key, to_identity_key, method,
           confidence, is_deterministic, reason, metadata)
        VALUES (
          ${client_key}, now(), ${winner.identity_key}, ${target_identity_key},
          'probabilistic_time_window', ${confidence}, false,
          'square_booking_probabilistic_stitch', ${metadata}::jsonb
        )
        -- 2-col ON CONFLICT + last-wins (2026-07-24 fix). Was DO NOTHING against
        -- the 3-col constraint (dropped as redundant). CAVEAT specific to this
        -- site: this is a PROBABILISTIC stitch (is_deterministic=false,
        -- confidence≤80). Under pure last-wins, a probabilistic match COULD
        -- overwrite a prior deterministic mapping (confidence=100) — that would
        -- be a quality regression. trg_log_alias_conflict captures every
        -- overwrite; if the conflict table shows this pattern in practice,
        -- add a confidence guard here:
        --   ...DO UPDATE SET ... WHERE EXCLUDED.confidence >=
        --     chapter_identity.identity_aliases.confidence
        ON CONFLICT (client_key, from_identity_key)
        DO UPDATE SET
          to_identity_key = EXCLUDED.to_identity_key,
          ts = EXCLUDED.ts,
          method = EXCLUDED.method,
          confidence = EXCLUDED.confidence,
          is_deterministic = EXCLUDED.is_deterministic,
          reason = EXCLUDED.reason,
          metadata = EXCLUDED.metadata
      `;

      return {
        matched: true,
        confidence,
        from_identity_key: winner.identity_key,
        click_ts: winner.ts,
        candidates_count: candidates.length,
      };
    });
  } catch (err) {
    console.error(
      `probabilistic stitch failed for client=${client_key} booking=${booking_id}:`,
      err
    );
    return { matched: false, reason: "error" };
  }
}
