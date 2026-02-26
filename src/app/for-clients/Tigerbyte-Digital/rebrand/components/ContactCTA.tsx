"use client";

import { useState } from "react";

export default function ContactCTA() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    message: "",
  });

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-[1200px] px-6 py-20">
        <div className="grid gap-10 md:grid-cols-12 md:items-start">
          {/* Left copy */}
          <div className="md:col-span-6">
            <h2 className="text-5xl font-black tracking-tight text-black">
              Let&apos;s Unlock Your
              <br />
              Revenue Potential
            </h2>

            <p className="mt-8 max-w-[55ch] text-base leading-relaxed text-neutral-800">
              Not sure where incremental revenue exists in your stack? We&apos;ll
              review your current setup, identify inefficiencies, and outline
              clear next steps — no obligation, no lock-in.
            </p>

            <p className="mt-10 text-base font-medium text-black">
              Request a free Monetization &amp; Revenue Audit
            </p>
          </div>

          {/* Right form card */}
          <div className="md:col-span-6">
            <div className="rounded-3xl bg-[#D9E0EC] p-8 shadow-sm">
              <h3 className="text-3xl font-black text-black">Contact us</h3>

              <form
                className="mt-8 space-y-6"
                onSubmit={(e) => {
                  e.preventDefault();
                  // Placeholder: wire to API later
                  console.log("Contact form submit (placeholder)", form);
                }}
              >
                <Field
                  label="First name"
                  value={form.firstName}
                  placeholder="First name"
                  onChange={(v) => setForm((s) => ({ ...s, firstName: v }))}
                />

                <Field
                  label="Last name"
                  value={form.lastName}
                  placeholder="Last name"
                  onChange={(v) => setForm((s) => ({ ...s, lastName: v }))}
                />

                <Field
                  label="Email *"
                  value={form.email}
                  placeholder="Email"
                  type="email"
                  onChange={(v) => setForm((s) => ({ ...s, email: v }))}
                />

                <div>
                  <label className="mb-2 block text-sm font-semibold text-neutral-900">
                    Message *
                  </label>
                  <textarea
                    value={form.message}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, message: e.target.value }))
                    }
                    placeholder="Message"
                    rows={6}
                    className="w-full resize-none rounded-xl border border-transparent bg-white px-4 py-3 text-base text-neutral-900 outline-none ring-0 placeholder:text-neutral-400 focus:border-neutral-300"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full rounded-full bg-[#F59A2F] px-6 py-4 text-base font-semibold text-white hover:opacity-95"
                  >
                    Submit
                  </button>
                </div>

              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-neutral-900">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-transparent bg-white px-4 py-3 text-base text-neutral-900 outline-none ring-0 placeholder:text-neutral-400 focus:border-neutral-300"
      />
    </div>
  );
}