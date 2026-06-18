"use client";

// Submit an inquiry from any dashboard page.
//
// Trigger: TopBar "Send inquiry" button (mounted globally in the topbar so
// it's accessible from every dashboard page). Submit calls submitInquiry()
// server action; if a screenshot was attached, uploadInquiryAttachment runs
// first. On success swaps to confirmation + auto-closes after 1.8s.
// Esc + backdrop click also close.
//
// Reuses the chapter-submit-* CSS classes from SubmitQuestionDrawer so this
// component doesn't introduce a new visual family — same modal shape, same
// button styling, same input look.

import React, { useEffect, useRef, useState } from "react";
import {
  submitInquiry,
  uploadInquiryAttachment,
  type InquiryCategory,
} from "@/app/lib/inquiries/actions";

const CATEGORIES: { value: InquiryCategory; label: string }[] = [
  { value: "data_question", label: "Data question" },
  { value: "bug_report", label: "Bug report" },
  { value: "feature_request", label: "Feature request" },
  { value: "billing", label: "Billing" },
  { value: "other", label: "Other" },
];

export function SubmitInquiryDrawer({
  open,
  onClose,
  clientKey,
  pagePath,
}: {
  open: boolean;
  onClose: () => void;
  clientKey: string;
  pagePath: string | null;
}) {
  const [category, setCategory] = useState<InquiryCategory>("data_question");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [ccText, setCcText] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const subjectRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setCategory("data_question");
    setSubject("");
    setBody("");
    setCcText("");
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setSubmitting(false);
    setConfirmed(false);
    setError(null);
    setTimeout(() => subjectRef.current?.focus(), 50);
  }, [open]);

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
    setSubmitting(true);

    try {
      const attachmentPaths: string[] = [];
      if (attachment) {
        const fd = new FormData();
        fd.append("file", attachment);
        const upRes = await uploadInquiryAttachment(fd);
        if (!upRes.ok) {
          setError(upRes.message);
          setSubmitting(false);
          return;
        }
        attachmentPaths.push(upRes.data!.path);
      }

      const cc_emails = ccText
        .split(/[,;\s]+/)
        .map((s) => s.trim())
        .filter((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s));

      const res = await submitInquiry({
        client_key: clientKey,
        subject,
        category,
        body,
        cc_emails,
        page_url: pagePath,
        attachment_paths: attachmentPaths,
      });

      if (!res.ok) {
        setError(res.message);
        setSubmitting(false);
        return;
      }
      setConfirmed(true);
      setTimeout(() => onClose(), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="chapter-submit-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="submit-inquiry-title"
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
            <h3 id="submit-inquiry-title" className="chapter-submit-title">Inquiry sent</h3>
            <p className="chapter-submit-body">
              You&rsquo;ll see updates in your inbox.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit}>
            <h3 id="submit-inquiry-title" className="chapter-submit-title">Send an inquiry</h3>
            <p className="chapter-submit-body">
              Chapter staff will reply in your inbox.
            </p>

            <label className="chapter-submit-label">
              Category <span className="chapter-submit-required">*</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as InquiryCategory)}
                disabled={submitting}
                className="chapter-submit-input"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </label>

            <label className="chapter-submit-label">
              Subject <span className="chapter-submit-required">*</span>
              <input
                ref={subjectRef}
                type="text"
                required
                maxLength={200}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={submitting}
                placeholder="Short description"
                className="chapter-submit-input"
              />
            </label>

            <label className="chapter-submit-label">
              Message <span className="chapter-submit-required">*</span>
              <textarea
                required
                rows={5}
                maxLength={4000}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                disabled={submitting}
                placeholder="Tell us what you need…"
                className="chapter-submit-input"
              />
              <div className="chapter-submit-counter">{body.length}/4000</div>
            </label>

            <label className="chapter-submit-label">
              CC <span className="chapter-submit-optional">(optional, comma-separated)</span>
              <input
                type="text"
                value={ccText}
                onChange={(e) => setCcText(e.target.value)}
                disabled={submitting}
                placeholder="colleague@example.com"
                className="chapter-submit-input"
              />
            </label>

            <label className="chapter-submit-label">
              Screenshot <span className="chapter-submit-optional">(optional, PNG/JPEG/GIF/WEBP, max 10MB)</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                onChange={(e) => setAttachment(e.target.files?.[0] ?? null)}
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
                disabled={submitting || !subject.trim() || !body.trim()}
                className="chapter-submit-primary"
              >
                {submitting ? "Sending…" : "Send inquiry"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
