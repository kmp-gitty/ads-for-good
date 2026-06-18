"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

// Login page sits outside the (authed) layout group — no sidebar / chrome.
// Whitelisted in middleware so unauthed visitors can render it.
//
// Flow:
//   1. User types email → submit
//   2. Server action (in _actions.ts) checks chapter_config.users for the
//      email. If not on the allowlist, returns the same "if registered, you'll
//      receive a link" response so the allowlist isn't leaked.
//   3. If allowed, Supabase signInWithOtp sends a magic link to the email.
//   4. User clicks the link → lands at /chapter/auth/callback → middleware
//      re-verifies allowlist, links auth.users.id ↔ chapter_config.users row,
//      redirects to the appropriate landing page based on role.

function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") || undefined;
  const errorCode = params.get("error");

  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(errorMessageFor(errorCode));
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/chapter-auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), next }),
      });
      // Same response shape regardless of whether the email is on the allowlist —
      // the server enforces the allowlist by simply not sending a link if not.
      if (res.status === 200) {
        const body = await res.json().catch(() => ({}));
        // Agency-staff bypass — @ads4good.com addresses get the legacy cookie
        // set directly and skip the magic-link email round-trip.
        if (body?.bypass && typeof body.redirect === "string") {
          window.location.href = body.redirect;
          return;
        }
        setSubmitted(true);
      } else {
        const body = await res.json().catch(() => ({}));
        setError(body?.error || `Auth failed (${res.status}).`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", display: "grid", placeItems: "center",
      background: "#F6F1E5", fontFamily: '"Helvetica Neue", Helvetica, Inter, Arial, sans-serif',
    }}>
      <form onSubmit={onSubmit} style={{
        width: 360, background: "white", border: "1px solid #E5DDC9",
        borderRadius: 14, padding: 28, boxShadow: "0 1px 2px rgba(31,45,67,.04)",
      }}>
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
            <p style={{ fontSize: 12, color: "#5C6B82", margin: "0 0 6px", lineHeight: 1.5 }}>
              If <strong>{email}</strong> is registered, a sign-in link is on its way.
            </p>
            <p style={{ fontSize: 12, color: "#5C6B82", margin: 0, lineHeight: 1.5 }}>
              The link is valid for 60 minutes. You can close this tab.
            </p>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: 18, fontWeight: 600, color: "#1F2D43", margin: "0 0 6px" }}>Sign in to the dashboard</h1>
            <p style={{ fontSize: 12, color: "#5C6B82", margin: "0 0 18px", lineHeight: 1.5 }}>
              We&rsquo;ll email you a one-time sign-in link.
            </p>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              autoFocus
              required
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 8,
                border: "1px solid #E5DDC9", fontSize: 14, outline: "none",
                background: "#FAFAF6", color: "#1F2D43",
              }}
            />
            {error && (
              <div style={{ marginTop: 10, fontSize: 12, color: "#B2452F" }}>{error}</div>
            )}
            <button
              type="submit"
              disabled={loading || !email}
              style={{
                marginTop: 14, width: "100%", padding: "10px 12px", borderRadius: 8,
                background: "#E36410", color: "white", border: "none",
                fontWeight: 600, fontSize: 14, cursor: loading || !email ? "not-allowed" : "pointer",
                opacity: loading || !email ? 0.6 : 1,
              }}
            >
              {loading ? "Sending…" : "Email me a link"}
            </button>
          </>
        )}
      </form>
    </div>
  );
}

function errorMessageFor(code: string | null): string | null {
  switch (code) {
    case "not_allowlisted":
      return "Your email isn't registered for the dashboard. Contact the admin.";
    case "forbidden":
      return "You don't have access to that page.";
    case "no_role":
      return "Your account has no assigned role. Contact the admin.";
    case "no_clients_yet":
      return "Your agency has no clients assigned yet. Contact the Chapter team.";
    case "callback_failed":
      return "Sign-in link couldn't be verified. Try again.";
    default:
      return null;
  }
}

export default function ChapterLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
