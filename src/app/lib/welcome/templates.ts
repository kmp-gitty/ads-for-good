// Welcome-sequence email copy (steps 0–6). renderWelcomeEmail(step, state)
// returns { subject, html } tailored to the tenant's tools + activation state,
// or null if there's nothing to say. Copy lives in code (Chapter's own
// onboarding) — easy to tweak here.

import type { WelcomeState } from "./state";

const BASE = "https://www.ads4good.com";
const LOGO = `${BASE}/images/ads4Good_Logo_500x500.png`;
const INK = "#1F2D43";
const MUTED = "#5C6B82";
const ORANGE = "#E36410";

function url(key: string, path = "home"): string {
  return `${BASE}/chapter/${key}/${path}`;
}

function shell(opts: { heading: string; body: string; ctaText: string; ctaHref: string }): string {
  return `
  <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:${INK};max-width:540px;margin:0 auto;padding:8px 4px;">
    <img src="${LOGO}" alt="Ads for Good" width="44" height="44" style="border-radius:9px;margin-bottom:16px;" />
    <h1 style="font-size:19px;font-weight:700;color:${INK};margin:0 0 12px;">${opts.heading}</h1>
    <div style="font-size:14.5px;color:${MUTED};line-height:1.6;">${opts.body}</div>
    <a href="${opts.ctaHref}" style="display:inline-block;margin:20px 0 6px;background:${ORANGE};color:#fff;font-size:14.5px;font-weight:600;text-decoration:none;padding:11px 22px;border-radius:9px;">${opts.ctaText}</a>
    <p style="font-size:12px;color:#8A98AD;margin-top:22px;line-height:1.5;">Chapter · by Ads for Good — <a href="${BASE}" style="color:${ORANGE};">ads4good.com</a>. Reply to this email if you need a hand.</p>
  </div>`;
}

function firstName(s: WelcomeState): string {
  return (s.name || "").trim().split(/\s+/)[0] || "there";
}

export function renderWelcomeEmail(step: number, s: WelcomeState): { subject: string; html: string } | null {
  const hasPrompts = s.tools.includes("smart_prompts");
  const hasLinks = s.tools.includes("smart_links");
  const trialDate = s.trialEndsAt
    ? new Date(s.trialEndsAt).toLocaleDateString("en-US", { month: "long", day: "numeric" })
    : "soon";

  switch (step) {
    case 0: {
      const steps: string[] = [];
      if (hasPrompts)
        steps.push(`<b>Smart Prompts</b> — create a prompt, install the pixel, and start capturing leads. <a href="${url(s.clientKey, "prompts/install")}" style="color:${ORANGE};font-weight:600;">Install Smart Prompts →</a>`);
      if (hasLinks)
        steps.push(`<b>Smart Links</b> — connect your domain, then build one link that routes every visitor to the right place. <a href="${url(s.clientKey, "links/domain")}" style="color:${ORANGE};font-weight:600;">Set up Smart Links →</a>`);
      const oneAction = hasPrompts
        ? `create your first <b>Smart Prompt</b>`
        : `connect your <b>branded domain</b>`;
      const devPage = hasPrompts ? url(s.clientKey, "prompts/install") : url(s.clientKey, "links/domain");
      return {
        subject: "Welcome to Chapter — your first 2 minutes",
        html: shell({
          heading: `Welcome, ${firstName(s)} 👋`,
          body: `
            Your <b>21-day free trial</b> is live — no card needed. Workspace: <b>${s.business}</b>.
            <div style="margin:14px 0;padding:14px 16px;background:#FBFAF6;border:1px solid #EFE9DB;border-radius:10px;">
              ${steps.map((x) => `<div style="margin:0 0 10px;">${x}</div>`).join("")}
              <div style="margin-top:2px;color:${INK};"><b>If you do one thing today:</b> ${oneAction}.</div>
            </div>
            Not the one who handles the tech? You can <a href="${devPage}" style="color:${ORANGE};font-weight:600;">email step-by-step setup instructions to your developer</a> straight from your dashboard.`,
          ctaText: "Open your dashboard →",
          ctaHref: url(s.clientKey, "home"),
        }),
      };
    }

    case 1:
    case 2: {
      const needPromptInstall = hasPrompts && !s.pixelInstalled;
      const needDomain = hasLinks && !s.domainConnected;
      if (!needPromptInstall && !needDomain) return null;
      const items: string[] = [];
      if (needPromptInstall)
        items.push(`Install the Chapter pixel to start capturing leads. <a href="${url(s.clientKey, "prompts/install")}" style="color:${ORANGE};font-weight:600;">Install Smart Prompts →</a>`);
      if (needDomain)
        items.push(`Connect your branded domain so your Smart Links can go live. <a href="${url(s.clientKey, "links/domain")}" style="color:${ORANGE};font-weight:600;">Set up your domain →</a>`);
      const ctaHref = needPromptInstall ? url(s.clientKey, "prompts/install") : url(s.clientKey, "links/domain");
      return {
        subject: step === 1 ? "Let's get you live" : "You're one step from live",
        html: shell({
          heading: step === 1 ? `One quick step, ${firstName(s)}` : `Still a step away`,
          body: `${step === 2 ? "Just a nudge — " : ""}here's what's left to finish setting up:
            <div style="margin:12px 0;">${items.map((x) => `<div style="margin:0 0 10px;padding-left:14px;border-left:3px solid #EFE9DB;">${x}</div>`).join("")}</div>
            It takes about two minutes, and you can hand it to your developer from the same page.`,
          ctaText: "Finish setup →",
          ctaHref,
        }),
      };
    }

    case 3: {
      const needPromptBuild = hasPrompts && !s.hasPrompt;
      const needLinkBuild = hasLinks && !s.hasLink;
      if (!needPromptBuild && !needLinkBuild) return null;
      const items: string[] = [];
      if (needPromptBuild)
        items.push(`<b>Your first Smart Prompt:</b> pick a moment (exit intent, time on page, a click), write a short offer, and choose what to capture. <a href="${url(s.clientKey, "prompts")}" style="color:${ORANGE};font-weight:600;">Create a prompt →</a>`);
      if (needLinkBuild)
        items.push(`<b>Your first Smart Link:</b> set a default destination, then add a rule or two (device, location, campaign) to route visitors automatically. <a href="${url(s.clientKey, "links")}" style="color:${ORANGE};font-weight:600;">Create a link →</a>`);
      return {
        subject: "How to build your first one",
        html: shell({
          heading: `Let's build something, ${firstName(s)}`,
          body: `A quick walkthrough to get your first one live:
            <div style="margin:12px 0;">${items.map((x) => `<div style="margin:0 0 12px;">${x}</div>`).join("")}</div>`,
          ctaText: needPromptBuild ? "Create a prompt →" : "Create a link →",
          ctaHref: needPromptBuild ? url(s.clientKey, "prompts") : url(s.clientKey, "links"),
        }),
      };
    }

    case 4: {
      const hasActivity = s.leads > 0 || s.clicks > 0;
      if (hasActivity) {
        const bits: string[] = [];
        if (s.leads > 0) bits.push(`<b>${s.leads.toLocaleString()}</b> lead${s.leads === 1 ? "" : "s"} captured`);
        if (hasLinks && s.clicks > 0) bits.push(`<b>${s.clicks.toLocaleString()}</b> link click${s.clicks === 1 ? "" : "s"}`);
        return {
          subject: "Your first week with Chapter",
          html: shell({
            heading: `Nice work, ${firstName(s)}`,
            body: `Here's what's happened so far: ${bits.join(" · ")}. ${
              s.leads > 0 ? `See your leads and where they came from` : `Keep the momentum going`
            } from your dashboard — and add more prompts or links to reach more of your visitors.`,
            ctaText: s.leads > 0 ? "View your leads →" : "Open dashboard →",
            ctaHref: s.leads > 0 ? url(s.clientKey, "prompts/leads") : url(s.clientKey, "home"),
          }),
        };
      }
      return {
        subject: "Let's get your first result",
        html: shell({
          heading: `A quick nudge, ${firstName(s)}`,
          body: `You're a week into your trial — let's get your first ${hasPrompts ? "lead" : "click"}. The setup is quick, and you can hand it to your developer in a couple of clicks. Happy to help if you're stuck — just reply.`,
          ctaText: "Finish setup →",
          ctaHref: hasPrompts ? url(s.clientKey, "prompts/install") : url(s.clientKey, "links/domain"),
        }),
      };
    }

    case 5:
      return {
        subject: "3 days left on your trial",
        html: shell({
          heading: `Your trial ends ${trialDate}`,
          body: `To keep your tools running, add a payment method. <b>Your setup and data stay safe either way</b> — if the trial lapses, your tools simply pause and switch back on the moment you subscribe. Nothing is lost.`,
          ctaText: "Add payment →",
          ctaHref: url(s.clientKey, "billing"),
        }),
      };

    case 6:
      return {
        subject: "Your trial's paused — pick up anytime",
        html: shell({
          heading: `Welcome back whenever you're ready`,
          body: `Your free trial has ended and your tools are paused for now. <b>Everything you built and captured is saved</b> — add a payment method and it all switches back on in one click.`,
          ctaText: "Reactivate →",
          ctaHref: url(s.clientKey, "billing"),
        }),
      };

    default:
      return null;
  }
}
