"use client";

// Approved sites tab: which ?to= destinations this client's links may forward
// to. Links made in Generate / Matrix / Import approve themselves; this is for
// reviewing the list, approving links written by hand, and seeing what was
// refused.

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addApprovedDestination,
  revokeApprovedDestination,
  type ApprovedRow,
  type BlockedRow,
} from "./_allowlist-actions";

const MODE_TEXT: Record<string, string> = {
  off: "Off — every ?to= address is forwarded.",
  log: "Watching — every ?to= address is still forwarded, but clicks to sites not on this list are flagged below.",
  enforce: "On — readers on a link to a site not on this list are sent to the paper's homepage instead.",
};

export default function AllowlistPanel({
  clientKey,
  mode,
  approved,
  blocked,
  error,
}: {
  clientKey: string;
  mode: string;
  approved: ApprovedRow[];
  blocked: BlockedRow[];
  error?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [input, setInput] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? approved.filter(r => r.value.includes(t)) : approved;
  }, [approved, q]);
  const sites = approved.filter(r => r.kind === "host").length;

  function add(value: string) {
    start(async () => {
      const res = await addApprovedDestination(clientKey, value);
      setMsg(res.message);
      if (res.ok) { setInput(""); router.refresh(); }
    });
  }

  function revoke(r: ApprovedRow) {
    if (!confirm(`Remove ${r.value}? Links to it will stop forwarding once the list refreshes (up to 5 minutes).`)) return;
    start(async () => {
      const res = await revokeApprovedDestination(clientKey, r.id);
      setMsg(res.ok ? `Removed ${r.value}.` : res.message ?? "Could not remove.");
      if (res.ok) router.refresh();
    });
  }

  const box = "rounded-lg border border-neutral-200 bg-white p-4";
  return (
    <div className="flex flex-col gap-4 text-sm text-neutral-800">
      {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}

      <div className={box}>
        <div className="font-semibold">Approved sites · {MODE_TEXT[mode] ? mode : "off"}</div>
        <p className="mt-1 text-neutral-600">{MODE_TEXT[mode] ?? MODE_TEXT.off}</p>
        <p className="mt-2 text-neutral-600">
          Links made in Generate, Matrix and Import approve their own destination automatically.
          For most sites the whole site is approved. On sites where anyone can publish (bit.ly,
          Linktree, Facebook, Eventbrite, Jotform and similar) only the exact page is approved,
          so nobody can point one of these links at their own page.
        </p>
      </div>

      <div className={box}>
        <div className="font-semibold">Approve a site or page</div>
        <div className="mt-2 flex gap-2">
          <input
            className="w-full rounded border border-neutral-300 px-2 py-1.5"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="https://partner.org/landing-page"
          />
          <button
            type="button"
            disabled={pending || !input.trim()}
            onClick={() => add(input)}
            className="rounded bg-orange-600 px-3 py-1.5 font-semibold text-white disabled:opacity-50"
          >
            Approve
          </button>
        </div>
        {msg && <p className="mt-2 text-neutral-700">{msg}</p>}
      </div>

      {blocked.length > 0 && (
        <div className={box}>
          <div className="font-semibold">Not on the list (last 30 days)</div>
          <p className="mt-1 text-neutral-600">
            Clicks on links whose destination is not approved. Approve the ones that are real partners.
          </p>
          <table className="mt-2 w-full text-left">
            <thead className="text-xs uppercase text-neutral-500">
              <tr><th className="py-1">Destination</th><th>Clicks</th><th>Last</th><th /></tr>
            </thead>
            <tbody>
              {blocked.map(b => (
                <tr key={b.key} className="border-t border-neutral-100">
                  <td className="py-1 font-mono text-xs">{b.key}</td>
                  <td>{b.clicks}</td>
                  <td className="text-xs text-neutral-500">{new Date(b.last_at).toLocaleDateString()}</td>
                  <td className="text-right">
                    <button type="button" disabled={pending} onClick={() => add(`https://${b.key}`)}
                      className="text-xs font-semibold text-orange-700 underline underline-offset-2">
                      Approve
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className={box}>
        <div className="flex items-center justify-between gap-3">
          <div className="font-semibold">
            {approved.length} approved · {sites} sites · {approved.length - sites} single pages
          </div>
          <input className="w-56 rounded border border-neutral-300 px-2 py-1" value={q}
            onChange={e => setQ(e.target.value)} placeholder="Search" />
        </div>
        <table className="mt-2 w-full text-left">
          <thead className="text-xs uppercase text-neutral-500">
            <tr><th className="py-1">Approved</th><th>Covers</th><th>Added by</th><th /></tr>
          </thead>
          <tbody>
            {shown.slice(0, 500).map(r => (
              <tr key={r.id} className="border-t border-neutral-100">
                <td className="py-1 font-mono text-xs">{r.value}</td>
                <td className="text-xs">{r.kind === "host" ? "whole site" : "this page only"}</td>
                <td className="text-xs text-neutral-500">{r.source}{r.added_by ? ` · ${r.added_by}` : ""}</td>
                <td className="text-right">
                  <button type="button" disabled={pending} onClick={() => revoke(r)}
                    className="text-xs text-neutral-500 underline underline-offset-2">Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {shown.length > 500 && <p className="mt-2 text-xs text-neutral-500">Showing 500 of {shown.length}; search to narrow.</p>}
      </div>
    </div>
  );
}
