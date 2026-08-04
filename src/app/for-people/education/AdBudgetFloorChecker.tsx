"use client";

import { useState } from "react";

// Ad budget floor checker. Both numbers come from the reader — no config, no
// benchmark, no ads4good rate, no CTA, no colour-coded verdict. The band
// paragraphs are the guide's own hedged verdicts and ship verbatim (spec §2.5).

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

type Parsed = { filled: boolean; value: number; error: string | null };

function parseMoney(
  raw: string,
  { min, max, belowMsg, aboveMsg }: { min: number; max: number; belowMsg: string; aboveMsg: string }
): Parsed {
  const t = raw.trim();
  if (t === "") return { filled: false, value: NaN, error: null };
  const n = Number(t.replace(/[$,\s]/g, ""));
  if (!isFinite(n)) return { filled: true, value: NaN, error: "Numbers only, please." };
  if (n < min) return { filled: true, value: n, error: belowMsg };
  if (n > max) return { filled: true, value: n, error: aboveMsg };
  return { filled: true, value: n, error: null };
}

const BAND_BELOW =
  "That's below the point where paying for management usually makes sense. There generally isn't enough data at this budget for anyone to optimise against, and the fee is taking a large share of a small total. Running simple campaigns yourself, or spending the money elsewhere until the budget grows, is often the better call.";
const BAND_GREY =
  "This is the genuinely arguable range. Whether it's worth it depends mostly on what your own time is worth and how complicated the account is. Worth asking hard questions about what the fee actually buys you each month.";
const BAND_ABOVE =
  "At this budget management usually earns its fee — a competent operator will generally save more in wasted spend than they cost. The question stops being whether to pay someone and becomes who, and on what model.";
const SELF_MANAGED =
  "Nothing's going to management, because you're running it yourself. That's the right answer more often than the industry admits — especially below a thousand a month. The question is what your time is worth once the budget grows.";
const CLOSING =
  "This is a rough guide, not a rule. A cheap fee attached to somebody logging in once a month costs more in wasted spend than it saves.";

const inputCls =
  "w-full rounded-lg border border-orange-200 bg-white px-3 py-2 text-[15px] text-neutral-900 placeholder:text-neutral-400 focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-300";
const labelCls = "block text-sm font-medium text-neutral-900";
const helpCls = "mt-1 text-xs leading-5 text-neutral-500";
const errCls = "mt-1 text-xs text-red-600";
const bodyP = "text-[14px] leading-relaxed text-neutral-700";

export default function AdBudgetFloorChecker() {
  const [spend, setSpend] = useState("");
  const [fee, setFee] = useState("");

  const s = parseMoney(spend, {
    min: 1,
    max: 1_000_000,
    belowMsg: "Enter your monthly ad budget.",
    aboveMsg: "At that scale none of this applies — you'll have people for it.",
  });
  const f = parseMoney(fee, {
    min: 0,
    max: 1_000_000,
    belowMsg: "Enter the fee you've been quoted.",
    aboveMsg: "Check that figure — that's higher than most agencies charge anyone.",
  });

  const sValid = s.filled && !s.error;
  const fValid = f.filled && !f.error;

  let result: React.ReactNode;
  try {
    if (sValid && fValid) {
      const total = s.value + f.value;
      const overhead = Math.round((f.value / total) * 100);
      const selfManaged = f.value === 0;
      const feeExceeds = f.value > s.value;
      const verdict =
        s.value < 1000 ? BAND_BELOW : s.value < 3000 ? BAND_GREY : BAND_ABOVE;

      result = (
        <div>
          <p className="text-2xl font-bold leading-tight text-neutral-900">
            {overhead}% of your money is going to management, not ads.
          </p>

          {selfManaged ? (
            <p className={`mt-3 ${bodyP}`}>{SELF_MANAGED}</p>
          ) : (
            <>
              <p className={`mt-3 ${bodyP}`}>{verdict}</p>
              {feeExceeds && (
                <p className={`mt-3 ${bodyP}`}>
                  You&apos;d be paying more to manage the ads than you&apos;d be spending on them.
                </p>
              )}
              <p className={`mt-3 border-t border-orange-200 pt-3 ${bodyP}`}>{CLOSING}</p>
            </>
          )}
        </div>
      );
    } else if (!s.filled && !f.filled) {
      result = <p className={bodyP}>Enter your spend and the fee you&apos;ve been quoted.</p>;
    } else if (!sValid && fValid) {
      result = <p className={bodyP}>One more — add your ad spend.</p>;
    } else if (sValid && !fValid) {
      result = <p className={bodyP}>One more — add the fee.</p>;
    } else {
      result = <p className={bodyP}>Enter your spend and the fee you&apos;ve been quoted.</p>;
    }
  } catch {
    result = <p className={bodyP}>Enter your spend and the fee you&apos;ve been quoted.</p>;
  }

  return (
    <div className="my-6 rounded-2xl border border-orange-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="grid grid-cols-1 gap-5">
        <div>
          <label htmlFor="ppc-spend" className={labelCls}>
            How much do you spend on ads each month?
          </label>
          <input
            id="ppc-spend"
            inputMode="decimal"
            className={`${inputCls} mt-1.5`}
            placeholder="1,500"
            value={spend}
            onChange={(e) => setSpend(e.target.value)}
          />
          <p className={helpCls}>
            What actually goes to Google, Meta, or wherever you advertise — not the fee.
          </p>
          {s.error && <p className={errCls}>{s.error}</p>}
        </div>

        <div>
          <label htmlFor="ppc-fee" className={labelCls}>
            What&apos;s the monthly fee you&apos;ve been quoted?
          </label>
          <input
            id="ppc-fee"
            inputMode="decimal"
            className={`${inputCls} mt-1.5`}
            placeholder="500"
            value={fee}
            onChange={(e) => setFee(e.target.value)}
          />
          <p className={helpCls}>
            The management fee only. If you&apos;ve been quoted a percentage of spend, work it out
            and put the dollar figure in.
          </p>
          {f.error && <p className={errCls}>{f.error}</p>}
        </div>
      </div>

      <div className="mt-5 rounded-xl bg-orange-50 p-4">{result}</div>
    </div>
  );
}
