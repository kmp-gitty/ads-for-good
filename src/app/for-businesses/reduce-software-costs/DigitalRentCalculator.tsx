"use client";

import { useState } from "react";

// Digital rent calculator. Every number comes from the reader — there is no
// config, no benchmark, no published figure, and (deliberately) no build price,
// payback period, or ROI anywhere. See the spec §2.6.

type Billing = "Monthly" | "Yearly";
type Row = { name: string; cost: string; billing: Billing };

const MAX_ROWS = 20;
const HORIZONS = [3, 5, 10] as const;

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

type CostParse = { filled: boolean; value: number; error: string | null };

function parseCost(raw: string): CostParse {
  const t = raw.trim();
  if (t === "") return { filled: false, value: NaN, error: null };
  const n = Number(t.replace(/[$,\s]/g, ""));
  if (!isFinite(n)) return { filled: true, value: NaN, error: "Numbers only, please." };
  if (n < 0.01) return { filled: true, value: n, error: "Enter what this one costs you." };
  if (n > 10000)
    return {
      filled: true,
      value: n,
      error: "That's a big one. Check whether that's the monthly or the annual price.",
    };
  return { filled: true, value: n, error: null };
}

const inputCls =
  "w-full rounded-lg border border-orange-200 bg-white px-3 py-2 text-[15px] text-neutral-900 placeholder:text-neutral-400 focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-300";

export default function DigitalRentCalculator() {
  const [rows, setRows] = useState<Row[]>([{ name: "", cost: "", billing: "Monthly" }]);
  const [increase, setIncrease] = useState("0");

  const setRow = (i: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRow = () =>
    setRows((rs) => (rs.length >= MAX_ROWS ? rs : [...rs, { name: "", cost: "", billing: "Monthly" }]));
  const removeRow = (i: number) => setRows((rs) => rs.filter((_, idx) => idx !== i));

  const atMax = rows.length >= MAX_ROWS;

  // Parse increase: valid 0–50, soft warning above 25; anything else → held flat.
  const incNum = Number(increase.trim().replace(/[%\s]/g, ""));
  const incValid = isFinite(incNum) && incNum >= 0 && incNum <= 50;
  const r = incValid ? incNum / 100 : 0;
  const incTooHigh = isFinite(incNum) && incNum > 25;

  let result: React.ReactNode = null;
  try {
    // Rows with a valid, in-range cost.
    const priced = rows
      .map((row) => ({ row, p: parseCost(row.cost) }))
      .filter((x) => x.p.filled && !x.p.error)
      .map((x) => ({
        name: x.row.name.trim(),
        monthly: x.row.billing === "Yearly" ? x.p.value / 12 : x.p.value,
      }));

    const monthlyTotal = priced.reduce((s, x) => s + x.monthly, 0);

    if (priced.length === 0 || monthlyTotal <= 0) {
      result = (
        <p className="text-[15px] leading-relaxed text-neutral-700">
          Add a subscription and we&apos;ll do the maths.
        </p>
      );
    } else {
      const annualTotal = monthlyTotal * 12;
      const total = (Y: number) =>
        r === 0 ? annualTotal * Y : annualTotal * ((Math.pow(1 + r, Y) - 1) / r);

      const named = priced.filter((x) => x.name !== "");
      const unnamed = priced.filter((x) => x.name === "");
      const showBreakdown = priced.length > 1 && named.length >= 1;
      const total5 = total(5);
      const shareOf = (monthly: number) => total5 * (monthly / monthlyTotal);

      result = (
        <div>
          <p className="text-[17px] font-semibold leading-snug text-neutral-900">
            You&apos;re paying {usd(monthlyTotal)} a month. That&apos;s {usd(annualTotal)} a year.
          </p>

          <div className="mt-4 space-y-2">
            {HORIZONS.map((Y) => (
              <div
                key={Y}
                className={`flex items-baseline justify-between gap-4 ${
                  Y === 5 ? "rounded-lg bg-orange-100 px-3 py-2" : "px-3"
                }`}
              >
                <span
                  className={
                    Y === 5
                      ? "text-[15px] font-semibold text-neutral-900"
                      : "text-[15px] text-neutral-600"
                  }
                >
                  {Y} years
                </span>
                <span
                  className={`tabular-nums ${
                    Y === 5
                      ? "text-xl font-bold text-neutral-900"
                      : "text-[15px] text-neutral-900"
                  }`}
                >
                  {usd(total(Y))}
                </span>
              </div>
            ))}
          </div>

          {showBreakdown && (
            <div className="mt-5">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Over five years:
              </p>
              <dl className="mt-2 space-y-1 text-[14px]">
                {named.map((x, i) => (
                  <div key={i} className="flex items-baseline justify-between gap-4">
                    <dt className="text-neutral-700">{x.name}</dt>
                    <dd className="tabular-nums text-neutral-900">{usd(shareOf(x.monthly))}</dd>
                  </div>
                ))}
                {unnamed.length > 0 && (
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-neutral-700">Everything else</dt>
                    <dd className="tabular-nums text-neutral-900">
                      {usd(shareOf(unnamed.reduce((s, x) => s + x.monthly, 0)))}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {incValid && incNum > 0 && (
            <p className="mt-4 text-xs leading-5 text-neutral-500">
              Assuming prices rise {incNum}% a year. That&apos;s your figure — set it to zero to
              see today&apos;s prices held flat.
            </p>
          )}

          <p className="mt-5 border-t border-orange-200 pt-4 text-[14px] leading-relaxed text-neutral-700">
            If those tools do exactly what you need and the number doesn&apos;t bother you, keep
            them. Renting is the right answer more often than anyone selling you a build will
            admit. It&apos;s the tools that don&apos;t quite fit, that you&apos;ve already paid for
            years, that are worth a second look.
          </p>
        </div>
      );
    }
  } catch {
    result = (
      <p className="text-[15px] leading-relaxed text-neutral-700">
        Add a subscription and we&apos;ll do the maths.
      </p>
    );
  }

  return (
    <div className="rounded-2xl border border-orange-200 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-sm font-medium text-neutral-900">What are you paying for?</p>

      {/* Column labels (once) */}
      <div className="mt-3 hidden grid-cols-[1fr_7rem_9rem_2rem] gap-3 px-1 text-xs font-medium text-neutral-500 sm:grid">
        <span>Tool name (optional)</span>
        <span>Cost</span>
        <span>Billing</span>
        <span />
      </div>

      <div className="mt-2 space-y-3">
        {rows.map((row, i) => {
          const p = parseCost(row.cost);
          return (
            <div key={i}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_7rem_9rem_2rem] sm:items-center">
                <input
                  className={inputCls}
                  placeholder="Elfsight, Privy, Mailchimp…"
                  maxLength={60}
                  value={row.name}
                  onChange={(e) => setRow(i, { name: e.target.value })}
                  aria-label="Tool name"
                />
                <div className="grid grid-cols-2 gap-3 sm:contents">
                  <input
                    className={inputCls}
                    inputMode="decimal"
                    placeholder="19.00"
                    value={row.cost}
                    onChange={(e) => setRow(i, { cost: e.target.value })}
                    aria-label="Cost"
                  />
                  <select
                    className={inputCls}
                    value={row.billing}
                    onChange={(e) => setRow(i, { billing: e.target.value as Billing })}
                    aria-label="Billing"
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Yearly">Yearly</option>
                  </select>
                </div>
                {rows.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    aria-label="Remove this tool"
                    className="flex h-11 w-11 items-center justify-center justify-self-start rounded-lg border border-orange-200 text-neutral-500 hover:bg-orange-50 hover:text-neutral-800 sm:h-8 sm:w-8"
                  >
                    ✕
                  </button>
                ) : (
                  <span className="hidden sm:block" />
                )}
              </div>
              {p.error && <p className="mt-1 text-xs text-red-600">{p.error}</p>}
            </div>
          );
        })}
      </div>

      <div className="mt-3">
        {atMax ? (
          <p className="text-xs text-neutral-500">Twenty&apos;s plenty — you&apos;ve made the point.</p>
        ) : (
          <button
            type="button"
            onClick={addRow}
            className="text-sm font-medium text-orange-600 hover:text-orange-700"
          >
            + Add another tool
          </button>
        )}
      </div>

      {/* Optional annual increase */}
      <div className="mt-5 border-t border-orange-100 pt-4">
        <label htmlFor="rent-increase" className="block text-sm font-medium text-neutral-900">
          Assume prices rise each year?
        </label>
        <div className="mt-1.5 flex items-center gap-2">
          <input
            id="rent-increase"
            inputMode="numeric"
            className={`${inputCls} max-w-[6rem]`}
            value={increase}
            onChange={(e) => setIncrease(e.target.value)}
          />
          <span className="text-sm text-neutral-500">% a year</span>
        </div>
        <p className="mt-1 text-xs leading-5 text-neutral-500">
          Most subscriptions do. Your assumption, not ours — we won&apos;t guess a rate for you.
        </p>
        {incTooHigh && (
          <p className="mt-1 text-xs text-red-600">
            That&apos;s steep. Try a smaller number too and see how the total moves.
          </p>
        )}
      </div>

      <div className="mt-5 rounded-xl bg-orange-50 p-4">{result}</div>
    </div>
  );
}
