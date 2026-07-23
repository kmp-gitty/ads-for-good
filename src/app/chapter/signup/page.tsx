"use client";

import React, { useMemo, useState } from "react";

// Self-serve signup page. Sits outside the (authed) layout group (no dashboard
// chrome) and is whitelisted in middleware so unauthed visitors can render it.
//
// Flow:
//   1. Visitor enters Name / Phone / Email / Company → submit
//   2. POST /api/chapter-auth/signup stages the form data in
//      chapter_config.pending_signups and sends an open magic link (no
//      allowlist gate) pointing at the callback tagged ?signup=1. If the email
//      already has an account, it sends a normal sign-in link instead.
//   3. Clicking the link → /chapter/auth/callback provisions a fresh tenant
//      (client_key + secret + client_employee user) and lands them at
//      /chapter/<client_key>/welcome.

// Mirrors chapter_config.provision_self_serve_tenant()'s slug rule so the
// preview matches what the server will assign (final counter is server-side).
function previewClientKey(company: string): string {
  let base = company
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/^[0-9]+/, "")
    .replace(/^_+/, "");
  if (!base) base = "workspace";
  return base.includes("_") ? base : `${base}_01`;
}

export default function ChapterSignupPage() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");

  const [submitted, setSubmitted] = useState(false);
  const [existing, setExisting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const keyPreview = useMemo(
    () => (company.trim() ? previewClientKey(company) : ""),
    [company],
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/chapter-auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          company: company.trim(),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 200 && body?.ok) {
        setExisting(Boolean(body.existing));
        setSubmitted(true);
      } else {
        setError(body?.error || `Signup failed (${res.status}).`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #E5DDC9",
    fontSize: 14,
    outline: "none",
    background: "#FAFAF6",
    color: "#1F2D43",
    marginTop: 4,
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    color: "#5C6B82",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#F6F1E5",
        fontFamily: '"Helvetica Neue", Helvetica, Inter, Arial, sans-serif',
        padding: "24px 0",
      }}
    >
      <form
        onSubmit={onSubmit}
        style={{
          width: 380,
          background: "white",
          border: "1px solid #E5DDC9",
          borderRadius: 14,
          padding: 28,
          boxShadow: "0 1px 2px rgba(31,45,67,.04)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <div style={{ width: 30, height: 30, background: "#E36410", color: "white", borderRadius: 8, display: "grid", placeItems: "center", fontWeight: 700 }}>C</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#1F2D43" }}>
            Chapter
            <span style={{ color: "#8A98AD", fontSize: 11, marginLeft: 6, textTransform: "uppercase", letterSpacing: ".12em", fontWeight: 400 }}>by afG</span>
          </div>
        </div>

        {submitted ? (
          <>
            <h1 style={{ fontSize: 18, fontWeight: 600, color: "#1F2D43", margin: "0 0 6px" }}>Check your inbox</h1>
            {existing ? (
              <p style={{ fontSize: 12, color: "#5C6B82", margin: 0, lineHeight: 1.5 }}>
                <strong>{email}</strong> already has an account — we sent a sign-in link. It&rsquo;s valid for 60 minutes.
              </p>
            ) : (
              <>
                <p style={{ fontSize: 12, color: "#5C6B82", margin: "0 0 6px", lineHeight: 1.5 }}>
                  We sent an activation link to <strong>{email}</strong>. Click it to start your 21-day free trial.
                </p>
                <p style={{ fontSize: 12, color: "#5C6B82", margin: 0, lineHeight: 1.5 }}>
                  The link is valid for 60 minutes. You can close this tab.
                </p>
              </>
            )}
          </>
        ) : (
          <>
            <h1 style={{ fontSize: 18, fontWeight: 600, color: "#1F2D43", margin: "0 0 4px" }}>Start your free trial</h1>
            <p style={{ fontSize: 12, color: "#5C6B82", margin: "0 0 16px", lineHeight: 1.5 }}>
              21 days of Smart Prompts + Smart Links. No card required.
            </p>

            <label style={labelStyle}>
              Full name
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} required autoFocus style={inputStyle} placeholder="Jane Doe" />
            </label>

            <div style={{ marginTop: 12 }}>
              <label style={labelStyle}>
                Phone
                <input value={phone} onChange={(e) => setPhone(e.target.value)} required style={inputStyle} placeholder="(555) 555-5555" />
              </label>
            </div>

            <div style={{ marginTop: 12 }}>
              <label style={labelStyle}>
                Email
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} placeholder="you@company.com" />
              </label>
            </div>

            <div style={{ marginTop: 12 }}>
              <label style={labelStyle}>
                Company
                <input value={company} onChange={(e) => setCompany(e.target.value)} required style={inputStyle} placeholder="Beans Coffee" />
              </label>
              {keyPreview && (
                <p style={{ fontSize: 11, color: "#8A98AD", margin: "6px 0 0", lineHeight: 1.5 }}>
                  Your workspace ID:{" "}
                  <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", color: "#1F2D43" }}>{keyPreview}</span>
                  <span style={{ color: "#B0B8C4" }}> — final ID confirmed after signup</span>
                </p>
              )}
            </div>

            {error && <div style={{ marginTop: 12, fontSize: 12, color: "#B2452F" }}>{error}</div>}

            <button
              type="submit"
              disabled={loading || !fullName || !email || !company}
              style={{
                marginTop: 16,
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                background: "#E36410",
                color: "white",
                border: "none",
                fontWeight: 600,
                fontSize: 14,
                cursor: loading || !fullName || !email || !company ? "not-allowed" : "pointer",
                opacity: loading || !fullName || !email || !company ? 0.6 : 1,
              }}
            >
              {loading ? "Sending…" : "Email me an activation link"}
            </button>

            <p style={{ fontSize: 12, color: "#8A98AD", margin: "14px 0 0", textAlign: "center" }}>
              Already have an account?{" "}
              <a href="/chapter/login" style={{ color: "#E36410", fontWeight: 600 }}>Sign in</a>
            </p>
          </>
        )}
      </form>
    </div>
  );
}
