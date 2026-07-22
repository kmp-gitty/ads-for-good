// Self-serve Home hub. Welcome + live trial status, tool tiles that link into
// each enabled tool, and a Getting Started checklist that ticks off as the
// tenant completes each step (all state read live from the DB).
//
// Rendered inside (authed) chrome. Clean URL /chapter/<key>/home is rewritten
// to /chapter/home?client=<key>, so we read the tenant from ?client. Access is
// enforced by middleware.

import Link from "next/link";
import { getClientEntitlement } from "@/app/lib/auth/chapter-user";
import { listPrompts, getActivationStatus } from "../prompts/_actions";
import { listLinks } from "../links/_actions";
import { getBrandedDomain } from "../links/domain/_actions";

export const metadata = { title: "Home" };
export const dynamic = "force-dynamic";

const INK = "#1F2D43";
const MUTED = "#5C6B82";
const FAINT = "#8A98AD";
const ORANGE = "#E36410";
const GREEN = "#2E7D5B";
const LINE = "#E5E0D4";
const PANEL = "#FBFAF6";

const TOOL_META: Record<string, { name: string; blurb: string; slug: string; noun: string }> = {
  smart_prompts: {
    name: "Smart Prompts",
    blurb: "On-site prompts that turn lost moments into conversions — capture an email, a form, or a sale at the right time.",
    slug: "prompts",
    noun: "prompt",
  },
  smart_links: {
    name: "Smart Links",
    blurb: "One link, many destinations. Route each visitor to the right page by device, location, time, or campaign.",
    slug: "links",
    noun: "link",
  },
};

type Step = { label: string; href: string; done: boolean; optional?: boolean };

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const { client } = await searchParams;
  const clientKey = (client || "").trim();
  const ent = clientKey ? await getClientEntitlement(clientKey) : null;

  const name = ent?.business_name || clientKey || "there";
  const tools = (ent?.tools_enabled || []).filter((t) => t !== "chapter");
  const hasPrompts = tools.includes("smart_prompts");
  const hasLinks = tools.includes("smart_links");

  const [prompts, links, activation, domain] = await Promise.all([
    hasPrompts ? listPrompts() : Promise.resolve([]),
    hasLinks ? listLinks() : Promise.resolve([]),
    hasPrompts ? getActivationStatus() : Promise.resolve(null),
    hasLinks ? getBrandedDomain() : Promise.resolve(null),
  ]);
  const brandedVerified = domain?.status === "verified";

  // Trial banner.
  let trialLine: string | null = null;
  if (ent?.billing_status === "trialing" && ent.trial_ends_at) {
    const days = Math.max(0, Math.ceil((new Date(ent.trial_ends_at).getTime() - Date.now()) / 86_400_000));
    const ends = new Date(ent.trial_ends_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    trialLine = `Free trial · ${days} day${days === 1 ? "" : "s"} left (through ${ends})`;
  }

  // Getting-started checklist — dynamic + sectioned (General / per-tool). Each
  // tool section only renders if the tool is enabled; future items get a clear
  // home (payment → General, branded domain → Smart Links).
  const sections: { title: string; steps: Step[] }[] = [
    {
      title: "General",
      steps: [
        { label: "Confirm your workspace details", href: `/chapter/${clientKey}/settings`, done: !!ent?.business_name },
      ],
    },
  ];
  if (hasPrompts) {
    sections.push({
      title: "Smart Prompts",
      steps: [
        { label: "Add your website", href: `/chapter/${clientKey}/prompts/install`, done: !!ent?.storefront_domain },
        { label: "Install your snippet and verify setup", href: `/chapter/${clientKey}/prompts/install`, done: !!activation?.connected },
        { label: "Create your first prompt", href: `/chapter/${clientKey}/prompts/new`, done: prompts.length > 0 },
      ],
    });
  }
  if (hasLinks) {
    sections.push({
      title: "Smart Links",
      steps: [
        { label: "Set up your branded domain", href: `/chapter/${clientKey}/links/domain`, done: brandedVerified },
        { label: "Create your first smart link", href: `/chapter/${clientKey}/links/new`, done: links.length > 0 },
      ],
    });
  }
  // Optional steps (e.g. branded domain — links work without it) don't count
  // toward completion, so a tenant happy on the generic URL can still be "all set".
  const allSteps = sections.flatMap((s) => s.steps.filter((x) => !x.optional));
  const doneCount = allSteps.filter((s) => s.done).length;
  const allDone = doneCount === allSteps.length && allSteps.length > 0;

  const countFor = (slug: string) => (slug === "prompts" ? prompts.length : slug === "links" ? links.length : 0);

  // Smart next-action per tile. Smart Prompts gates on install (the pixel must
  // be live before a prompt can fire), so route to Install first, then create,
  // then manage. Smart Links requires a branded domain first, then create,
  // then manage.
  const ctaFor = (t: string): { href: string; label: string } => {
    if (t === "smart_prompts") {
      if (!activation?.connected) return { href: `/chapter/${clientKey}/prompts/install`, label: "Set up Smart Prompts →" };
      if (prompts.length === 0) return { href: `/chapter/${clientKey}/prompts/new`, label: "Create your first prompt →" };
      return { href: `/chapter/${clientKey}/prompts`, label: "Manage Smart Prompts →" };
    }
    if (!brandedVerified) return { href: `/chapter/${clientKey}/links/domain`, label: "Set up Smart Links →" };
    if (links.length === 0) return { href: `/chapter/${clientKey}/links/new`, label: "Create your first link →" };
    return { href: `/chapter/${clientKey}/links`, label: "Manage Smart Links →" };
  };

  return (
    <div style={{ padding: "28px 30px 60px", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: INK, margin: "0 0 6px" }}>Welcome, {name} 👋</h1>
          <p style={{ fontSize: 14, color: MUTED, margin: 0 }}>Your workspace is live. Here&rsquo;s what&rsquo;s included on your plan.</p>
        </div>
        {trialLine && (
          <div style={{ background: "#FFF4EC", border: `1px solid ${ORANGE}33`, color: ORANGE, borderRadius: 999, padding: "7px 14px", fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap" }}>
            {trialLine}
          </div>
        )}
      </div>

      {/* Tool tiles — link into each tool */}
      <div style={{ display: "grid", gridTemplateColumns: tools.length > 1 ? "1fr 1fr" : "1fr", gap: 16, marginTop: 24 }}>
        {tools.map((t) => {
          const meta = TOOL_META[t];
          if (!meta) return null;
          const n = countFor(meta.slug);
          const cta = ctaFor(t);
          return (
            <Link key={t} href={cta.href} style={{ textDecoration: "none", display: "block", background: "white", border: `1px solid ${LINE}`, borderRadius: 12, padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: INK }}>{meta.name}</span>
                <span style={{ fontSize: 10, color: FAINT, textTransform: "uppercase", letterSpacing: ".1em", border: `1px solid ${LINE}`, borderRadius: 999, padding: "2px 7px" }}>
                  {n} {meta.noun}{n === 1 ? "" : "s"}
                </span>
              </div>
              <p style={{ fontSize: 13, color: MUTED, margin: "0 0 14px", lineHeight: 1.55 }}>{meta.blurb}</p>
              <span style={{ fontSize: 13, fontWeight: 600, color: ORANGE }}>{cta.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Getting-started checklist */}
      <div style={{ background: PANEL, border: `1px solid ${LINE}`, borderRadius: 12, padding: 20, marginTop: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: INK }}>Getting started</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: allDone ? GREEN : FAINT }}>
            {allDone ? "All set ✓" : `${doneCount} of ${allSteps.length} done`}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {sections.map((sect) => {
            const req = sect.steps.filter((x) => !x.optional);
            const sDone = req.filter((x) => x.done).length;
            return (
              <div key={sect.title}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0 4px 4px" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: FAINT, textTransform: "uppercase", letterSpacing: ".08em" }}>{sect.title}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: sDone === req.length ? GREEN : FAINT }}>{sDone}/{req.length}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {sect.steps.map((s, i) => (
                    <Link
                      key={i}
                      href={s.href}
                      style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 10px", borderRadius: 8, textDecoration: "none", background: "transparent" }}
                    >
                      <span
                        style={{
                          flexShrink: 0,
                          width: 20,
                          height: 20,
                          borderRadius: 999,
                          background: s.done ? GREEN : "white",
                          border: `1px solid ${s.done ? GREEN : LINE}`,
                          color: "white",
                          fontSize: 12,
                          fontWeight: 700,
                          display: "grid",
                          placeItems: "center",
                        }}
                      >
                        {s.done ? "✓" : ""}
                      </span>
                      <span style={{ fontSize: 13.5, color: s.done ? FAINT : INK, textDecoration: s.done ? "line-through" : "none", flex: 1 }}>
                        {s.label}
                        {s.optional && <span style={{ fontSize: 11, fontWeight: 600, color: FAINT, marginLeft: 8 }}>Optional</span>}
                      </span>
                      {!s.done && <span style={{ fontSize: 12.5, fontWeight: 600, color: ORANGE }}>Do this →</span>}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        {allDone && (
          <p style={{ fontSize: 12.5, color: MUTED, margin: "12px 2px 0", lineHeight: 1.5 }}>
            You&rsquo;re live 🎉 Keep an eye on the <strong style={{ color: INK }}>Responses</strong> tab to see how your prompts perform.
          </p>
        )}
      </div>
    </div>
  );
}
