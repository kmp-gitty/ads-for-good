"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import {
  logTouchpoint,
  searchProspects,
  type ProspectSearchResult,
} from "./_actions";

const CHANNELS = [
  { value: "phone", label: "Phone" },
  { value: "text", label: "Text" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "in_person", label: "In-person" },
  { value: "other", label: "Other" },
  { value: "note", label: "Note (internal)" },
];

const DIRECTIONS = [
  { value: "outbound", label: "Outbound (we contacted them)" },
  { value: "inbound", label: "Inbound (they contacted us)" },
];

// Local datetime → ISO string for the server. `new Date(local).toISOString()`
// would use the local TZ for parsing, which is what we want — operator types
// "now in their time", server stores UTC.
function localDateTimeToIso(local: string): string {
  if (!local) return new Date().toISOString();
  return new Date(local).toISOString();
}

function nowLocalDateTime(): string {
  const d = new Date();
  // YYYY-MM-DDTHH:mm in local time (for the datetime-local input).
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function LogTouchpointForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProspectSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<ProspectSearchResult | null>(null);
  const [channel, setChannel] = useState("phone");
  const [direction, setDirection] = useState("outbound");
  const [occurredAtLocal, setOccurredAtLocal] = useState(nowLocalDateTime());
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  // Debounced search
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim() || selected) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const res = await searchProspects(query);
      setSearching(false);
      if (res.ok) setResults(res.data ?? []);
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, selected]);

  const resetForm = () => {
    setQuery("");
    setSelected(null);
    setResults([]);
    setChannel("phone");
    setDirection("outbound");
    setOccurredAtLocal(nowLocalDateTime());
    setSubject("");
    setBody("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!selected) {
      setError("Pick a prospect from the search results.");
      return;
    }
    startTransition(async () => {
      const res = await logTouchpoint({
        prospect_id: selected.id,
        channel,
        direction,
        occurred_at: localDateTimeToIso(occurredAtLocal),
        subject: subject || null,
        body: body || null,
      });
      if (res.ok) {
        setSuccess(
          `Logged ${channel} for ${selected.business_name}${selected.contact_name ? ` (${selected.contact_name})` : ""}.`,
        );
        resetForm();
      } else {
        setError(res.message);
      }
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-4 rounded-lg border border-neutral-200 bg-white p-5 shadow-sm sm:grid-cols-2"
    >
      <div className="sm:col-span-2">
        <span className="text-xs font-medium uppercase tracking-wider text-neutral-600">
          Prospect <span className="ml-1 text-red-500">*</span>
        </span>
        {selected ? (
          <div className="mt-1 flex items-center justify-between rounded-md border border-orange-300 bg-orange-50 px-3 py-2">
            <div className="text-sm">
              <div className="font-medium text-neutral-900">
                {selected.business_name}
                {selected.contact_name ? (
                  <span className="text-neutral-600"> · {selected.contact_name}</span>
                ) : null}
              </div>
              {selected.email ? (
                <div className="text-xs text-neutral-500">{selected.email}</div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => {
                setSelected(null);
                setQuery("");
              }}
              className="text-xs font-medium text-orange-700 hover:text-orange-900"
            >
              Change
            </button>
          </div>
        ) : (
          <div className="relative mt-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={inputCls}
              placeholder="Type business, contact, or email…"
            />
            {(searching || results.length > 0) && query.trim() ? (
              <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-neutral-200 bg-white shadow-lg">
                {searching ? (
                  <li className="px-3 py-2 text-sm text-neutral-500">Searching…</li>
                ) : results.length === 0 ? (
                  <li className="px-3 py-2 text-sm text-neutral-500">No matches</li>
                ) : (
                  results.map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelected(r);
                          setResults([]);
                        }}
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-orange-50"
                      >
                        <div className="font-medium text-neutral-900">
                          {r.business_name}
                        </div>
                        <div className="text-xs text-neutral-500">
                          {r.contact_name ?? "—"}
                          {r.email ? ` · ${r.email}` : ""}
                        </div>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            ) : null}
          </div>
        )}
      </div>

      <Field label="Channel">
        <select
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          className={inputCls}
        >
          {CHANNELS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Direction">
        <select
          value={direction}
          onChange={(e) => setDirection(e.target.value)}
          className={inputCls}
        >
          {DIRECTIONS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="When">
        <input
          type="datetime-local"
          value={occurredAtLocal}
          onChange={(e) => setOccurredAtLocal(e.target.value)}
          className={inputCls}
        />
      </Field>

      <Field label="Subject / short label">
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className={inputCls}
          placeholder="Left voicemail, sent intro DM, etc."
        />
      </Field>

      <Field label="Note" colSpanFull>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          className={`${inputCls} resize-y`}
          placeholder="What happened, what's next"
        />
      </Field>

      <div className="sm:col-span-2 flex items-center justify-between gap-3">
        <div className="text-sm">
          {error ? <span className="text-red-600">{error}</span> : null}
          {success ? <span className="text-emerald-700">{success}</span> : null}
        </div>
        <button
          type="submit"
          disabled={pending || !selected}
          className="rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Logging…" : "Log touchpoint"}
        </button>
      </div>
    </form>
  );
}

const inputCls =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500";

function Field({
  label,
  colSpanFull,
  children,
}: {
  label: string;
  colSpanFull?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${colSpanFull ? "sm:col-span-2" : ""}`}>
      <span className="text-xs font-medium uppercase tracking-wider text-neutral-600">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
