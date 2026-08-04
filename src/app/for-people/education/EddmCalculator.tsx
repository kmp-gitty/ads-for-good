"use client";

import { useState } from "react";

// ⚠️ OPERATOR CONFIG — all drifting values live here and nowhere else.
// The page MUST NOT go live with postagePerPiece null or ratesAsOf empty:
// in that state the calculator renders the disabled notice, never a total.
// Never invent these numbers. Verify postage at usps.com.
const EDDM_CONFIG = {
  // Current USPS EDDM Retail postage, USD per piece. Verify at usps.com.
  postagePerPiece: 0.26 as number | null,

  // Date the rate above was verified, e.g. "4 August 2026". Rendered visibly.
  ratesAsOf: "4 August 2026",

  postageSourceUrl: "https://www.usps.com/business/every-door-direct-mail.htm",

  // OPTIONAL: EDDM Retail daily piece cap per ZIP. Null → cap notice never renders.
  retailDailyCapPerZip: 5000 as number | null,

  // OPTIONAL: typical print cost per piece range, USD, from jobs actually run.
  // Leave both null → the print field shows a neutral placeholder instead.
  printCostHintLow: null as number | null,
  printCostHintHigh: null as number | null,
};

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const intFmt = (n: number) => Math.trunc(n).toLocaleString("en-US");

type Parsed = { filled: boolean; value: number; error: string | null };

function parseNumber(
  raw: string,
  { min, max, integer, belowMsg, aboveMsg, nonNumericMsg }: {
    min: number;
    max: number;
    integer?: boolean;
    belowMsg: string;
    aboveMsg: string;
    nonNumericMsg?: string;
  }
): Parsed {
  const trimmed = raw.trim();
  if (trimmed === "") return { filled: false, value: NaN, error: null };
  const n = Number(trimmed.replace(/[$,\s]/g, ""));
  if (!isFinite(n) || (integer && !Number.isInteger(n))) {
    return { filled: true, value: NaN, error: nonNumericMsg ?? "Numbers only, please." };
  }
  if (n < min) return { filled: true, value: n, error: belowMsg };
  if (n > max) return { filled: true, value: n, error: aboveMsg };
  return { filled: true, value: n, error: null };
}

const inputCls =
  "w-full rounded-lg border border-orange-200 bg-white px-3 py-2 text-[15px] text-neutral-900 placeholder:text-neutral-400 focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-300";
const labelCls = "block text-sm font-medium text-neutral-900";
const helpCls = "mt-1 text-xs leading-5 text-neutral-500";
const errCls = "mt-1 text-xs text-red-600";

export default function EddmCalculator() {
  const [households, setHouseholds] = useState("");
  const [printCost, setPrintCost] = useState("");
  const [drops, setDrops] = useState("1");
  const [design, setDesign] = useState("0");
  const [responseRate, setResponseRate] = useState("");
  const [showResponse, setShowResponse] = useState(false);

  const disabled = EDDM_CONFIG.postagePerPiece == null || !EDDM_CONFIG.ratesAsOf;

  if (disabled) {
    return (
      <div className="my-6 rounded-2xl border border-orange-200 bg-orange-50/60 p-5 sm:p-6">
        <p className="text-[15px] leading-relaxed text-neutral-800">
          The cost calculator is being updated with current USPS rates. In the
          meantime, the current EDDM postage rate is on the{" "}
          <a
            href={EDDM_CONFIG.postageSourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-orange-600 underline hover:text-orange-700"
          >
            USPS EDDM page
          </a>
          .
        </p>
      </div>
    );
  }

  const postage = EDDM_CONFIG.postagePerPiece as number;

  const hh = parseNumber(households, {
    min: 1,
    max: 500000,
    integer: true,
    belowMsg: "Enter at least 1 household.",
    aboveMsg:
      "That's larger than most EDDM drops. Check the number — and at that scale, talk to a mail house.",
    nonNumericMsg: "Numbers only, please.",
  });
  const pc = parseNumber(printCost, {
    min: 0.001,
    max: 5.0,
    belowMsg: "Enter your printer's per-piece price.",
    aboveMsg:
      "That's high for a per-piece print cost. Check whether that quote is per piece or for the whole run.",
  });
  const dr = parseNumber(drops, {
    min: 1,
    max: 24,
    integer: true,
    belowMsg: "Enter at least 1 drop.",
    aboveMsg: "Two years of monthly drops is a lot. Check the number.",
  });
  const dz = parseNumber(design, {
    min: 0,
    max: 50000,
    belowMsg: "Design cost can't be negative.",
    aboveMsg: "Check that figure — that's a lot for one postcard.",
  });
  const rr = parseNumber(responseRate, {
    min: 0.01,
    max: 100,
    belowMsg: "Enter a response rate above 0.",
    aboveMsg:
      "That's optimistic for untargeted mail. Try a lower number too and see how the cost per response moves.",
  });
  const responseTooHigh = rr.filled && !rr.error && rr.value > 5;

  const printHint =
    EDDM_CONFIG.printCostHintLow != null && EDDM_CONFIG.printCostHintHigh != null
      ? `Get a quote for the quantity above — per-piece cost drops sharply with volume. We typically see $${EDDM_CONFIG.printCostHintLow}–$${EDDM_CONFIG.printCostHintHigh}.`
      : "Get a quote for the quantity above — per-piece cost drops sharply with volume.";

  // Result gating
  const requiredValid = hh.filled && !hh.error && pc.filled && !pc.error;
  const dropsVal = dr.filled && !dr.error ? dr.value : 1;
  const designVal = dz.filled && !dz.error ? dz.value : 0;

  let result: React.ReactNode = null;
  try {
    if (!hh.filled && !pc.filled) {
      result = (
        <p className="text-[15px] leading-relaxed text-neutral-700">
          Enter your household count and print quote to see what a drop costs.
        </p>
      );
    } else if (!hh.filled || !pc.filled) {
      const missing = !pc.filled ? "add your print quote" : "add your household count";
      result = (
        <p className="text-[15px] leading-relaxed text-neutral-700">
          One more — {missing} and we&apos;ll do the maths.
        </p>
      );
    } else if (requiredValid) {
      const perPiece = postage + pc.value;
      const perDrop = hh.value * perPiece;
      const postageTotal = hh.value * postage * dropsVal;
      const printTotal = hh.value * pc.value * dropsVal;
      const total = perDrop * dropsVal + designVal;
      const perHousehold = total / hh.value;

      const showResp = showResponse && rr.filled && !rr.error;
      const responses = showResp ? hh.value * dropsVal * (rr.value / 100) : 0;
      const costPerResponse = showResp && responses > 0 ? total / responses : 0;

      const capHit =
        EDDM_CONFIG.retailDailyCapPerZip != null &&
        hh.value > EDDM_CONFIG.retailDailyCapPerZip;

      result = (
        <div>
          <p className="text-[17px] font-semibold leading-snug text-neutral-900">
            {usd(total)} to mail {intFmt(hh.value)} households {dropsVal} time
            {dropsVal === 1 ? "" : "s"}.
          </p>
          <p className="mt-1 text-[15px] text-neutral-700">
            That&apos;s {usd(perHousehold)} per household reached.
          </p>

          <dl className="mt-4 space-y-1 text-[14px]">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-neutral-600">Postage</dt>
              <dd className="tabular-nums text-neutral-900">{usd(postageTotal)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-neutral-600">Printing</dt>
              <dd className="tabular-nums text-neutral-900">{usd(printTotal)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-neutral-600">Design</dt>
              <dd className="tabular-nums text-neutral-900">
                {designVal === 0 ? "—" : usd(designVal)}
              </dd>
            </div>
          </dl>

          <p className="mt-4 text-xs leading-5 text-neutral-500">
            Postage calculated at {usd(postage)} per piece, EDDM Retail, as of{" "}
            {EDDM_CONFIG.ratesAsOf}. Rates change — check the current figure at{" "}
            <a
              href={EDDM_CONFIG.postageSourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-neutral-700"
            >
              USPS
            </a>
            .
          </p>

          {showResp && responses > 0 && (
            <p className="mt-4 text-[14px] leading-relaxed text-neutral-700">
              At {rr.value}%, that&apos;s about {intFmt(responses)} responses, or{" "}
              {usd(costPerResponse)} each. That&apos;s your assumption, not a
              benchmark. Move it and watch what happens.
            </p>
          )}

          {capHit && (
            <p className="mt-4 text-[14px] leading-relaxed text-neutral-700">
              Heads up: EDDM Retail caps pieces per ZIP code per day. A drop this
              size may need splitting across days or ZIPs, or moving to BMEU. See
              &ldquo;The two versions&rdquo; above.
            </p>
          )}

          <p className="mt-5 border-t border-orange-200 pt-4 text-[14px] leading-relaxed text-neutral-700">
            If that number looks steep for a first test, it probably is. Sharing a
            co-op mailer costs a fraction of a solo drop — see below.
          </p>
        </div>
      );
    }
  } catch {
    result = (
      <p className="text-[15px] leading-relaxed text-neutral-800">
        The cost calculator is being updated with current USPS rates. In the
        meantime, the current EDDM postage rate is on the{" "}
        <a
          href={EDDM_CONFIG.postageSourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-orange-600 underline hover:text-orange-700"
        >
          USPS EDDM page
        </a>
        .
      </p>
    );
  }

  return (
    <div className="my-6 rounded-2xl border border-orange-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="grid grid-cols-1 gap-5">
        {/* Field 1 — Households */}
        <div>
          <label htmlFor="eddm-hh" className={labelCls}>
            How many households?
          </label>
          <input
            id="eddm-hh"
            inputMode="numeric"
            className={`${inputCls} mt-1.5`}
            placeholder="1,000"
            value={households}
            onChange={(e) => setHouseholds(e.target.value)}
          />
          <p className={helpCls}>
            The USPS EDDM tool shows household counts for each route you select.
            Add them up.
          </p>
          {hh.error && <p className={errCls}>{hh.error}</p>}
        </div>

        {/* Field 2 — Print cost per piece */}
        <div>
          <label htmlFor="eddm-print" className={labelCls}>
            What does your printer charge per piece?
          </label>
          <input
            id="eddm-print"
            inputMode="decimal"
            className={`${inputCls} mt-1.5`}
            placeholder="0.00"
            value={printCost}
            onChange={(e) => setPrintCost(e.target.value)}
          />
          <p className={helpCls}>{printHint}</p>
          {pc.error && <p className={errCls}>{pc.error}</p>}
        </div>

        {/* Field 3 — Number of drops */}
        <div>
          <label htmlFor="eddm-drops" className={labelCls}>
            How many times will you mail these routes?
          </label>
          <input
            id="eddm-drops"
            inputMode="numeric"
            className={`${inputCls} mt-1.5`}
            value={drops}
            onChange={(e) => setDrops(e.target.value)}
          />
          <p className={helpCls}>
            One drop into a neighborhood is a coin flip. Results come from
            repetition.
          </p>
          {dr.error && <p className={errCls}>{dr.error}</p>}
        </div>

        {/* Field 4 — Design cost */}
        <div>
          <label htmlFor="eddm-design" className={labelCls}>
            Design cost, one-off
          </label>
          <input
            id="eddm-design"
            inputMode="decimal"
            className={`${inputCls} mt-1.5`}
            value={design}
            onChange={(e) => setDesign(e.target.value)}
          />
          <p className={helpCls}>
            Your time or someone else&apos;s. Leave blank if you&apos;re designing
            it yourself.
          </p>
          {dz.error && <p className={errCls}>{dz.error}</p>}
        </div>

        {/* Field 5 — Response rate (collapsed) */}
        <div>
          {!showResponse ? (
            <button
              type="button"
              onClick={() => setShowResponse(true)}
              className="min-h-[44px] text-left text-sm font-medium text-orange-600 hover:text-orange-700"
            >
              Add a response rate →
            </button>
          ) : (
            <>
              <label htmlFor="eddm-rr" className={labelCls}>
                What response rate are you assuming?
              </label>
              <input
                id="eddm-rr"
                inputMode="decimal"
                className={`${inputCls} mt-1.5`}
                placeholder="%"
                value={responseRate}
                onChange={(e) => setResponseRate(e.target.value)}
              />
              <p className={helpCls}>
                Your assumption, not ours. We won&apos;t guess this for you.
              </p>
              {rr.error && <p className={errCls}>{rr.error}</p>}
              {responseTooHigh && !rr.error && (
                <p className={errCls}>
                  That&apos;s optimistic for untargeted mail. Try a lower number
                  too and see how the cost per response moves.
                </p>
              )}
            </>
          )}
        </div>
      </div>

      <div className="mt-5 rounded-xl bg-orange-50 p-4">{result}</div>
    </div>
  );
}
