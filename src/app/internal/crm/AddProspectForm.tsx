"use client";

import { useState, useTransition } from "react";
import { addProspect } from "./_actions";

const STAGES = [
  "new",
  "contacted",
  "engaged",
  "qualified",
  "meeting",
  "proposal",
  "won",
  "lost",
  "dormant",
];

export default function AddProspectForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [stage, setStage] = useState("new");
  const [source, setSource] = useState("internal_page");
  const [notes, setNotes] = useState("");

  const reset = () => {
    setBusinessName("");
    setContactName("");
    setEmail("");
    setPhone("");
    setStage("new");
    setSource("internal_page");
    setNotes("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const res = await addProspect({
        business_name: businessName,
        contact_name: contactName || null,
        email: email || null,
        phone_number: phone || null,
        stage,
        source,
        notes: notes || null,
      });
      if (res.ok) {
        setSuccess(`Added ${businessName}.`);
        reset();
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
      <Field label="Business name" required>
        <input
          type="text"
          required
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          className={inputCls}
          placeholder="Acme Coffee Roasters"
        />
      </Field>

      <Field label="Contact name">
        <input
          type="text"
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          className={inputCls}
          placeholder="Jane Doe"
        />
      </Field>

      <Field label="Email">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputCls}
          placeholder="jane@acme.com"
        />
      </Field>

      <Field label="Phone">
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className={inputCls}
          placeholder="+1 555 0100"
        />
      </Field>

      <Field label="Stage">
        <select
          value={stage}
          onChange={(e) => setStage(e.target.value)}
          className={inputCls}
        >
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Source">
        <input
          type="text"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className={inputCls}
          placeholder="internal_page"
        />
      </Field>

      <Field label="Notes" colSpanFull>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className={`${inputCls} resize-y`}
          placeholder="Anything operator should remember"
        />
      </Field>

      <div className="sm:col-span-2 flex items-center justify-between gap-3">
        <div className="text-sm">
          {error ? <span className="text-red-600">{error}</span> : null}
          {success ? <span className="text-emerald-700">{success}</span> : null}
        </div>
        <button
          type="submit"
          disabled={pending || !businessName.trim()}
          className="rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Adding…" : "Add prospect"}
        </button>
      </div>
    </form>
  );
}

const inputCls =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500";

function Field({
  label,
  required,
  colSpanFull,
  children,
}: {
  label: string;
  required?: boolean;
  colSpanFull?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${colSpanFull ? "sm:col-span-2" : ""}`}>
      <span className="text-xs font-medium uppercase tracking-wider text-neutral-600">
        {label}
        {required ? <span className="ml-1 text-red-500">*</span> : null}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
