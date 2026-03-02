"use client";

import { useMemo, useState } from "react";
import Header from "./../components/Header";
import Footer from "./../components/Footer";

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  website: string;
  monthlySessions: string;
  stack: string;
  goal: string;
  message: string;
};

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState<FormState>({
    firstName: "",
    lastName: "",
    email: "",
    website: "",
    monthlySessions: "",
    stack: "",
    goal: "",
    message: "",
  });

  const goals = useMemo(
    () => [
      "Increase ad revenue (RPM / RPMV / eCPM)",
      "Improve viewability / CTR",
      "Fix layout / UX while monetizing",
      "AdOps support (GAM / trafficking / reporting)",
      "AdSense optimization",
      "Not sure — want an audit",
    ],
    []
  );

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    // UI-only for now (wire to API later)
    console.log("Contact submit (placeholder)", form);

    setSubmitted(true);
  }

  return (
    <main>
      <Header />

      {/* HERO */}
      <section style={{ backgroundColor: "var(--tb-light)" }}>
        <div className="mx-auto max-w-[1200px] px-6 py-16">
          <div className="grid gap-12 md:grid-cols-12 md:items-start">
            {/* Left copy */}
            <div className="md:col-span-6">
              <h1
                className="text-4xl md:text-5xl font-black tracking-tight"
                style={{ color: "var(--tb-dark)" }}
              >
                Let's Unlock Your Revenue Potential
              </h1>

              <p
                className="mt-6 text-base leading-relaxed"
                style={{ color: "var(--tb-dark)", opacity: 0.85 }}
              >
                If you’re already running ads, we’ll show you where incremental lift is
                hiding — without wrecking UX or locking you into a platform. If you’re
                not monetizing yet, we’ll tell you whether you should & what to do.
              </p>

              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                <TrustChip title="Independent consulting" desc="No lock-in. No rev share." />
                <TrustChip title="GAM + AdSense experts" desc="Practical, operator-led guidance." />
                <TrustChip title="UX-safe optimization" desc="Revenue without spam layouts." />
                <TrustChip title="Clear next steps" desc="A roadmap you can execute." />
              </div>

              <div className="mt-10 rounded-2xl border bg-white p-6">
                <div
                  className="text-sm font-semibold"
                  style={{ color: "var(--tb-dark)" }}
                >
                  What happens after you submit?
                </div>
                <ul
                  className="mt-3 list-disc space-y-2 pl-5 text-sm"
                  style={{ color: "var(--tb-dark)", opacity: 0.85 }}
                >
                  <li>We reply within 1 business day (usually faster).</li>
                  <li>We’ll ask for access (or screenshots) only if needed.</li>
                  <li>You get a short audit summary + recommended next steps.</li>
                </ul>
              </div>
              {/* Micro FAQ (conversion helper) */}
            <div className="mt-6 rounded-2xl border bg-white p-6">
                <div
                  className="text-sm font-semibold"
                  style={{ color: "var(--tb-dark)" }}
                >
                  Quick answers
                </div>
                <div className="mt-4 space-y-4">
                  <MiniQA
                    q="Do you require access to our accounts?"
                    a="Not always. We can start with screenshots and a short walkthrough. If deeper diagnostics are needed, we’ll request read-only access."
                  />
                  <MiniQA
                    q="Do you take a revenue share?"
                    a="No. We’re independent consultants. You keep ownership of your accounts, relationships, and decisions."
                  />
                  <MiniQA
                    q="Can you help if we only run AdSense?"
                    a="Yes. We frequently work with AdSense-only publishers — and can advise when it’s time to graduate to GAM."
                  />
                </div>
              </div>
            </div>


            {/* Right form */}
            <div className="md:col-span-6">
              <div
                className="rounded-3xl p-8 shadow-sm"
                style={{
                  backgroundColor: "var(--tb-blue)",
                  border: "1px solid rgba(0,0,0,0.08)",
                }}
              >
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <h2
                      className="text-3xl font-black tracking-tight"
                      style={{ color: "var(--tb-dark)" }}
                    >
                      Contact Tigerbyte Digital
                    </h2>
                    <p
                      className="mt-2 text-sm"
                      style={{ color: "var(--tb-dark)", opacity: 0.85 }}
                    >
                      Tell us a little about your site. The more context, the better the audit.
                    </p>
                  </div>
                </div>

                {!submitted ? (
                  <form className="mt-8 space-y-5" onSubmit={onSubmit}>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field
                        label="First name"
                        value={form.firstName}
                        placeholder="First name"
                        onChange={(v) => update("firstName", v)}
                      />
                      <Field
                        label="Last name"
                        value={form.lastName}
                        placeholder="Last name"
                        onChange={(v) => update("lastName", v)}
                      />
                    </div>

                    <Field
                      label="Email *"
                      value={form.email}
                      placeholder="you@company.com"
                      type="email"
                      required
                      onChange={(v) => update("email", v)}
                    />

                    <Field
                      label="Website URL"
                      value={form.website}
                      placeholder="https://example.com"
                      onChange={(v) => update("website", v)}
                    />

                    <div className="grid gap-4 sm:grid-cols-2">
                      <SelectField
                        label="Monthly sessions"
                        value={form.monthlySessions}
                        onChange={(v) => update("monthlySessions", v)}
                        options={[
                          "Not sure",
                          "< 50k",
                          "50k – 250k",
                          "250k – 1M",
                          "1M+",
                        ]}
                      />

                      <SelectField
                        label="Current stack"
                        value={form.stack}
                        onChange={(v) => update("stack", v)}
                        options={[
                          "Not sure",
                          "AdSense",
                          "Google Ad Manager",
                          "Both (AdSense + GAM)",
                          "Other / multiple partners",
                          "Not monetizing yet",
                        ]}
                      />
                    </div>

                    <SelectField
                      label="Primary goal"
                      value={form.goal}
                      onChange={(v) => update("goal", v)}
                      options={goals}
                    />

                    <TextArea
                      label="What’s going on? *"
                      value={form.message}
                      placeholder="Examples: RPM dropped, ads not filling, want cleaner layout, want a second opinion on our setup..."
                      required
                      onChange={(v) => update("message", v)}
                    />

                    <button
                      type="submit"
                      className="w-full rounded-full px-6 py-4 text-base font-semibold transition hover:brightness-95"
                      style={{
                        backgroundColor: "var(--tb-orange)",
                        color: "var(--tb-light)",
                        border: "2px solid #000",
                      }}
                    >
                      Submit Request
                    </button>

                    <p
                      className="text-xs"
                      style={{ color: "var(--tb-dark)", opacity: 0.75 }}
                    >
                      By submitting, you agree we may contact you about your request.
                      (This form is UI-only right now — wire submission next.)
                    </p>
                  </form>
                ) : (
                  <div className="mt-8 rounded-2xl bg-white p-8">
                    <h3
                      className="text-2xl font-black"
                      style={{ color: "var(--tb-dark)" }}
                    >
                      You’re all set.
                    </h3>
                    <p
                      className="mt-3 text-sm leading-relaxed"
                      style={{ color: "var(--tb-dark)", opacity: 0.85 }}
                    >
                      We received your request and will respond within 1 business day.
                      If you included a website URL, we’ll take a quick look before replying.
                    </p>

                    <div className="mt-6">
                      <button
                        type="button"
                        onClick={() => setSubmitted(false)}
                        className="rounded-full px-5 py-2 text-sm font-semibold"
                        style={{
                          backgroundColor: "var(--tb-light)",
                          color: "var(--tb-dark)",
                          border: "1px solid rgba(0,0,0,0.15)",
                        }}
                      >
                        Submit another request
                      </button>
                    </div>
                  </div>
                )}
              </div>

              
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

function TrustChip({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-2xl border bg-white p-5">
      <div className="text-sm font-black" style={{ color: "var(--tb-dark)" }}>
        {title}
      </div>
      <div className="mt-2 text-sm" style={{ color: "var(--tb-dark)", opacity: 0.8 }}>
        {desc}
      </div>
    </div>
  );
}

function MiniQA({ q, a }: { q: string; a: string }) {
  return (
    <div>
      <div className="text-sm font-semibold" style={{ color: "var(--tb-dark)" }}>
        {q}
      </div>
      <div className="mt-1 text-sm" style={{ color: "var(--tb-dark)", opacity: 0.85 }}>
        {a}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label
        className="mb-2 block text-sm font-semibold"
        style={{ color: "var(--tb-dark)" }}
      >
        {label}
      </label>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-transparent bg-white px-4 py-3 text-base outline-none placeholder:text-neutral-400 focus:border-neutral-300"
        style={{ color: "var(--tb-dark)" }}
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label
        className="mb-2 block text-sm font-semibold"
        style={{ color: "var(--tb-dark)" }}
      >
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-transparent bg-white px-4 py-3 text-base outline-none focus:border-neutral-300"
        style={{ color: "var(--tb-dark)" }}
      >
        <option value="" disabled>
          Select…
        </option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <div>
      <label
        className="mb-2 block text-sm font-semibold"
        style={{ color: "var(--tb-dark)" }}
      >
        {label}
      </label>
      <textarea
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={6}
        className="w-full resize-none rounded-xl border border-transparent bg-white px-4 py-3 text-base outline-none placeholder:text-neutral-400 focus:border-neutral-300"
        style={{ color: "var(--tb-dark)" }}
      />
    </div>
  );
}