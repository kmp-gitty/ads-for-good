// Minimal, dependency-free CSV builder for lead exports (dashboard + weekly
// cron). RFC-4180-ish quoting: wrap in quotes, double internal quotes.

export function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  let s: string;
  if (typeof v === "object") s = JSON.stringify(v);
  else s = String(v);
  if (/[",\n\r]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}

export function toCsv(columns: { key: string; label: string }[], rows: Record<string, unknown>[]): string {
  const header = columns.map((c) => csvCell(c.label)).join(",");
  const lines = rows.map((r) => columns.map((c) => csvCell(r[c.key])).join(","));
  return [header, ...lines].join("\r\n");
}

// Column layout shared by the dashboard export + the weekly CSV. Journey columns
// are only populated by the cron (which enriches from the identity graph).
export const LEAD_COLUMNS: { key: string; label: string }[] = [
  { key: "captured_at", label: "Captured at" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "prompt_slug", label: "Prompt" },
  { key: "consent_value", label: "Consent" },
  { key: "consent_declined", label: "Declined" },
  { key: "consent_text", label: "Consent text" },
  { key: "responses", label: "Form responses" },
  { key: "page_url", label: "Captured on page" },
  { key: "ip_country", label: "Country" },
  { key: "pages_viewed", label: "Pages viewed" },
  { key: "entry_channel", label: "Entry channel" },
  { key: "first_seen", label: "First seen" },
];
