"use client";

// Suggest-a-question modal for the Observations page.
//
// Trigger: button in the Observations page header. On click, opens this
// drawer/modal centered on screen. Submit posts to /api/internal/observations-submissions.
// On success, the form swaps to a brief confirmation state, then auto-closes
// after 2 seconds. Esc + backdrop click also close.

import React, { useEffect, useRef, useState } from "react";

export function SubmitQuestionDrawer({
  open,
  onClose,
  clientKey,
}: {
  open: boolean;
  onClose: () => void;
  clientKey: string;
}) {
  const [questionText, setQuestionText] = useState("");
  const [contextText, setContextText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Reset state when reopening; focus the first input.
  useEffect(() => {
    if (!open) return;
    setQuestionText("");
    setContextText("");
    setSubmitting(false);
    setConfirmed(false);
    setError(null);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }, [open]);

  // Esc to close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, submitting, onClose]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (questionText.trim().length < 8) {
      setError("Question is too short — please share a bit more detail.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/internal/observations-submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_key: clientKey,
          question_text: questionText.trim(),
          context_text: contextText.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error || `Submit failed (${res.status})`);
        setSubmitting(false);
        return;
      }
      setConfirmed(true);
      // Auto-close after 2 seconds.
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="chapter-submit-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="submit-q-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div className="chapter-submit-card">
        <button
          type="button"
          className="chapter-submit-close"
          aria-label="Close"
          onClick={onClose}
          disabled={submitting}
        >
          ×
        </button>

        {confirmed ? (
          <div style={{ padding: "12px 4px" }}>
            <h3 id="submit-q-title" className="chapter-submit-title">Thanks — we'll review it.</h3>
            <p className="chapter-submit-body">
              We&rsquo;ll let you know if it&rsquo;s added to the library.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit}>
            <h3 id="submit-q-title" className="chapter-submit-title">Suggest an observation question</h3>
            <p className="chapter-submit-body">
              What pattern would you like Chapter to watch for? The Chapter team reviews submissions and adds promising ones to the question library.
            </p>

            <label className="chapter-submit-label">
              Question <span className="chapter-submit-required">*</span>
              <textarea
                ref={textareaRef}
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="e.g. When email subscribers convert at twice the rate of non-subscribers, flag the channels they're entering through so we can double down."
                rows={4}
                maxLength={1000}
                disabled={submitting}
                className="chapter-submit-input"
              />
              <div className="chapter-submit-counter">{questionText.length}/1000</div>
            </label>

            <label className="chapter-submit-label">
              Why this matters <span className="chapter-submit-optional">(optional)</span>
              <textarea
                value={contextText}
                onChange={(e) => setContextText(e.target.value)}
                placeholder="What decision would this help inform?"
                rows={3}
                maxLength={500}
                disabled={submitting}
                className="chapter-submit-input"
              />
            </label>

            {error && <p className="chapter-submit-error">{error}</p>}

            <div className="chapter-submit-actions">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="chapter-submit-cancel"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || questionText.trim().length < 8}
                className="chapter-submit-primary"
              >
                {submitting ? "Submitting…" : "Submit"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
