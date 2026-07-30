"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateSettings } from "./_actions";
import { requestAccountDeletion } from "./_delete-actions";

const INK = "#1F2D43";
const MUTED = "#5C6B82";
const FAINT = "#8A98AD";
const ORANGE = "#E36410";
const GREEN = "#2E7D5B";
const LINE = "#E5E0D4";
const PANEL = "#FBFAF6";

const TOOL_LABELS: Record<string, string> = {
  smart_prompts: "Smart Prompts",
  smart_links: "Smart Links",
  chapter: "Chapter Analytics",
};

export default function SettingsClient({
  clientKey,
  businessName: initialBusiness,
  fullName: initialName,
  phone: initialPhone,
  email,
  tools,
  planLabel,
}: {
  clientKey: string;
  businessName: string;
  fullName: string;
  phone: string;
  email: string;
  tools: string[];
  planLabel: string;
}) {
  const [businessName, setBusinessName] = useState(initialBusiness);
  const [fullName, setFullName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const dirty = businessName !== initialBusiness || fullName !== initialName || phone !== initialPhone;

  const save = () => {
    setMsg(null);
    startTransition(async () => {
      const res = await updateSettings({ businessName, fullName, phone });
      setMsg(res.ok ? { ok: true, text: "Saved ✓" } : { ok: false, text: res.error });
    });
  };

  return (
    <div style={{ padding: "28px 30px 60px", maxWidth: 640, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: INK, margin: "0 0 4px" }}>Settings</h1>
      <p style={{ fontSize: 14, color: MUTED, margin: "0 0 22px" }}>Your workspace and account details.</p>

      {/* Editable */}
      <div style={{ background: "white", border: `1px solid ${LINE}`, borderRadius: 12, padding: "20px 22px" }}>
        <Field label="Business name">
          <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} style={inp} />
        </Field>
        <Field label="Your name">
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" style={inp} />
        </Field>
        <Field label="Phone" last>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 555-5555" style={inp} />
        </Field>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 18 }}>
          <button
            type="button"
            disabled={pending || !dirty}
            onClick={save}
            style={{ background: ORANGE, color: "white", fontSize: 14, fontWeight: 600, border: "none", borderRadius: 10, padding: "10px 20px", cursor: dirty ? "pointer" : "default", opacity: pending || !dirty ? 0.55 : 1 }}
          >
            {pending ? "Saving…" : "Save changes"}
          </button>
          {msg && <span style={{ fontSize: 13, fontWeight: 600, color: msg.ok ? GREEN : "#B3261E" }}>{msg.text}</span>}
        </div>
      </div>

      {/* Read-only account info */}
      <div style={{ background: "white", border: `1px solid ${LINE}`, borderRadius: 12, padding: "6px 22px 4px", marginTop: 16 }}>
        <ReadRow label="Login email" value={email || "—"} note="Contact us to change your login email." />
        <ReadRow label="Workspace ID" value={clientKey || "—"} mono />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, padding: "13px 0" }}>
          <span style={labelCss}>Tools</span>
          <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 14, color: INK, fontWeight: 500 }}>
              {tools.map((t) => TOOL_LABELS[t] || t).join(", ") || "—"}
            </span>
            <Link href={`/chapter/${clientKey}/billing`} style={{ fontSize: 12.5, fontWeight: 600, color: ORANGE, textDecoration: "none" }}>
              Manage in Billing →
            </Link>
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, padding: "13px 0", borderTop: `1px solid ${LINE}` }}>
          <span style={labelCss}>Plan</span>
          <span style={{ fontSize: 14, color: INK, fontWeight: 500, textTransform: "capitalize" }}>{planLabel}</span>
        </div>
      </div>

      <DangerZone businessName={initialBusiness || clientKey} />
    </div>
  );
}

const DANGER = "#B3261E";

function DangerZone({ businessName }: { businessName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const matches = confirm.trim().toLowerCase() === businessName.trim().toLowerCase();

  function onDelete() {
    setError(null);
    start(async () => {
      const res = await requestAccountDeletion(confirm);
      if (res.ok) router.refresh(); // layout gate swaps in the pending-deletion screen
      else setError(res.error);
    });
  }

  return (
    <div style={{ background: "white", border: `1px solid #E7C9C4`, borderRadius: 12, padding: "18px 22px", marginTop: 28 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: DANGER, marginBottom: 4 }}>Delete account</div>
      <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.6, margin: "0 0 12px" }}>
        We&rsquo;ll email you a full export of your leads, submissions, and links, stop billing, and turn off your
        workspace. Your account and all data are permanently erased <strong>30 days</strong> later — you can reactivate
        anytime before then.
      </p>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{ background: "white", color: DANGER, fontSize: 13.5, fontWeight: 600, border: `1px solid #E7C9C4`, borderRadius: 9, padding: "9px 16px", cursor: "pointer" }}
        >
          Delete my account…
        </button>
      ) : (
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: INK, marginBottom: 6 }}>
            Type <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{businessName}</span> to confirm
          </div>
          <input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={businessName}
            autoFocus
            style={{ ...inp, borderColor: "#E7C9C4" }}
          />
          {error && <div style={{ fontSize: 12.5, color: DANGER, marginTop: 8 }}>{error}</div>}
          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <button
              type="button"
              disabled={!matches || pending}
              onClick={onDelete}
              style={{ background: DANGER, color: "white", fontSize: 13.5, fontWeight: 600, border: "none", borderRadius: 9, padding: "9px 16px", cursor: matches && !pending ? "pointer" : "not-allowed", opacity: matches && !pending ? 1 : 0.5 }}
            >
              {pending ? "Scheduling…" : "Schedule deletion"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => { setOpen(false); setConfirm(""); setError(null); }}
              style={{ background: "white", color: MUTED, fontSize: 13.5, fontWeight: 600, border: `1px solid ${LINE}`, borderRadius: 9, padding: "9px 16px", cursor: "pointer" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const inp: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  fontSize: 14,
  color: INK,
  background: "white",
  border: `1px solid ${LINE}`,
  borderRadius: 8,
  padding: "9px 11px",
};

const labelCss: React.CSSProperties = { fontSize: 12.5, color: FAINT, textTransform: "uppercase", letterSpacing: ".08em" };

function Field({ label, last, children }: { label: string; last?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: last ? 0 : 14 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: INK, marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

function ReadRow({ label, value, mono, note }: { label: string; value: string; mono?: boolean; note?: string }) {
  return (
    <div style={{ padding: "13px 0", borderBottom: `1px solid ${LINE}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16 }}>
        <span style={labelCss}>{label}</span>
        <span style={{ fontSize: 14, color: INK, fontWeight: 500, fontFamily: mono ? "ui-monospace, SFMono-Regular, Menlo, monospace" : undefined, textAlign: "right" }}>{value}</span>
      </div>
      {note && <div style={{ fontSize: 11.5, color: FAINT, marginTop: 3, background: PANEL, display: "inline-block", padding: "1px 0" }}>{note}</div>}
    </div>
  );
}
