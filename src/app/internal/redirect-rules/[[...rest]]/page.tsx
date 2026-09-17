// Shim: /internal/redirect-rules/* → /internal/chapter-links/*
//
// The builder moved to /internal/chapter-links (merged with the former
// /internal/outreach-builder). This optional catch-all preserves every old
// path shape — the bare index, a client page, a rule edit, analytics — so
// existing bookmarks and the "Redirects →" nav links in sibling /internal
// layouts keep working without touching those files.
//
// redirect() issues a 307 (temporary) on purpose: this shim is meant to be
// deleted once the old URLs have aged out, and a permanent redirect would sit
// in browser caches after it's gone.
//
// DELETE ME once no one is landing here (~a few weeks after ship).

import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function RedirectRulesShim({
  params,
  searchParams,
}: {
  params: Promise<{ rest?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { rest } = await params;
  const sp = await searchParams;

  const path = (rest ?? []).map(encodeURIComponent).join("/");
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string") qs.set(k, v);
    else if (Array.isArray(v) && v.length) qs.set(k, v[0]);
  }
  const query = qs.toString();

  redirect(`/internal/chapter-links${path ? `/${path}` : ""}${query ? `?${query}` : ""}`);
}
