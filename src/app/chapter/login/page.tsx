"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Sits outside the chapter layout (login should not show the sidebar / chrome).
// Route is whitelisted in middleware so unauthed users can render it.
function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/chapter";

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/chapter-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.status === 200) {
        router.push(next);
        router.refresh();
      } else if (res.status === 401) {
        setError("Incorrect password.");
      } else if (res.status === 503) {
        setError("CHAPTER_DASH_TOKEN env var not configured on the server.");
      } else {
        setError(`Auth failed (${res.status}).`);
      }
    } catch (e: any) {
      setError(e?.message || "Network error");
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
        <h1 style={{ fontSize: 18, fontWeight: 600, color: "#1F2D43", margin: "0 0 6px" }}>Sign in to the dashboard</h1>
        <p style={{ fontSize: 12, color: "#5C6B82", margin: "0 0 18px", lineHeight: 1.5 }}>
          Internal agency-operator surface. Stopgap auth until Supabase auth is wired up.
        </p>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
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
          disabled={loading || !password}
          style={{
            marginTop: 14, width: "100%", padding: "10px 12px", borderRadius: 8,
            background: "#E36410", color: "white", border: "none",
            fontWeight: 600, fontSize: 14, cursor: loading || !password ? "not-allowed" : "pointer",
            opacity: loading || !password ? 0.6 : 1,
          }}
        >
          {loading ? "Checking…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

export default function ChapterLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
