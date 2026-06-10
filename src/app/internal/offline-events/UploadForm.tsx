"use client";

import { useState } from "react";

type Summary = {
  event_id: string;
  cohort_id: string;
  rows_total: number;
  rows_ingested: number;
  rows_skipped_no_identity: number;
  unresolved_hash_samples: string[];
};

export default function UploadForm({ clientKeys }: { clientKeys: string[] }) {
  const [clientKey, setClientKey] = useState(clientKeys[0] ?? "");
  const [eventSlug, setEventSlug] = useState("");
  const [eventName, setEventName] = useState("");
  const [eventTs, setEventTs] = useState("");
  const [location, setLocation] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSummary(null);
    if (!file) {
      setError("Pick a CSV file");
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.set("client_key", clientKey);
      fd.set("event_slug", eventSlug);
      fd.set("event_name", eventName);
      fd.set("event_ts", new Date(eventTs).toISOString());
      fd.set("location", location);
      fd.set("csv", file);

      const res = await fetch("/api/internal/offline-events/upload", {
        method: "POST",
        body: fd,
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setError(body.error || `Upload failed (${res.status})`);
        return;
      }
      setSummary(body.summary as Summary);
      // Clear the file so user can't accidentally re-submit. Other fields
      // stay so they can correct & retry without retyping.
      setFile(null);
      (document.getElementById("offline-csv-input") as HTMLInputElement | null)?.value && ((document.getElementById("offline-csv-input") as HTMLInputElement).value = "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="grid grid-cols-2 gap-4">
        <label className="block text-sm">
          <span className="block font-semibold text-neutral-800">Client</span>
          <select
            value={clientKey}
            onChange={e => setClientKey(e.target.value)}
            required
            className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm bg-white"
          >
            {clientKeys.map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="block font-semibold text-neutral-800">Event date</span>
          <input
            type="date"
            value={eventTs}
            onChange={e => setEventTs(e.target.value)}
            required
            className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="block text-sm">
          <span className="block font-semibold text-neutral-800">Event slug</span>
          <span className="block text-xs text-neutral-500">lowercase + underscores. Becomes the milestone_name in attribution.</span>
          <input
            type="text"
            value={eventSlug}
            onChange={e => setEventSlug(e.target.value.toLowerCase().replace(/\s+/g, "_"))}
            required
            placeholder="summer_block_party_2026"
            pattern="[a-z0-9_]+"
            className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="block font-semibold text-neutral-800">Event name</span>
          <span className="block text-xs text-neutral-500">Human-readable; shown in UI.</span>
          <input
            type="text"
            value={eventName}
            onChange={e => setEventName(e.target.value)}
            placeholder="Summer Block Party 2026"
            className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
      </div>

      <label className="block text-sm">
        <span className="block font-semibold text-neutral-800">Location (optional)</span>
        <input
          type="text"
          value={location}
          onChange={e => setLocation(e.target.value)}
          placeholder="123 Main St, Downtown"
          className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
      </label>

      <label className="block text-sm">
        <span className="block font-semibold text-neutral-800">Attendee CSV</span>
        <span className="block text-xs text-neutral-500">
          Required: <code>email</code> or <code>phone</code>. Optional: <code>name</code>, any questionnaire columns.
        </span>
        <input
          id="offline-csv-input"
          type="file"
          accept=".csv,text/csv"
          onChange={e => setFile(e.target.files?.[0] ?? null)}
          required
          className="mt-2 w-full text-sm"
        />
      </label>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {summary && (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <p className="font-semibold">Uploaded.</p>
          <ul className="mt-2 space-y-1 font-mono text-xs">
            <li>Rows in CSV: {summary.rows_total}</li>
            <li>Ingested: {summary.rows_ingested}</li>
            <li>Skipped (no identity): {summary.rows_skipped_no_identity}</li>
            <li>Event id: {summary.event_id}</li>
            <li>Cohort id: {summary.cohort_id}</li>
            <li>Hash samples: {summary.unresolved_hash_samples.join(", ") || "—"}</li>
          </ul>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-full bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
      >
        {submitting ? "Uploading…" : "Upload event"}
      </button>
    </form>
  );
}
