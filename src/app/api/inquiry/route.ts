import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

export const runtime = "nodejs"; // keep on Node (not Edge)

// Supabase (server-side)
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Resend
const resend = new Resend(process.env.RESEND_API_KEY);

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeServices(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter(Boolean).map(String);

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];

    // try JSON array first
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
    } catch {
      // fall back to comma-separated
      return trimmed
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }

  return [];
}

function buildAutoReplyHtml(params: {
  firstName?: string;
  companyName?: string;
  companyWebsite?: string;
  services?: string[];
  details?: string;
}) {
  const firstName = params.firstName ? escapeHtml(params.firstName) : "there";
  const companyName = params.companyName ? escapeHtml(params.companyName) : "";
  const website = params.companyWebsite ? escapeHtml(params.companyWebsite) : "—";

  const servicesList =
    params.services && params.services.length
      ? params.services.map(escapeHtml).join(", ")
      : "—";

  const details = params.details ? escapeHtml(params.details) : "";

  return `
  <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; background:#ffffff; color:#111827; padding:24px;">
    <div style="max-width:560px; margin:0 auto; border:1px solid #e5e7eb; border-radius:16px; overflow:hidden;">
      <div style="padding:20px 22px; background:#fff7ed;">
        <div style="font-size:16px; font-weight:700; color:#111827;">ads for Good</div>
        <div style="font-size:13px; color:#6b7280; margin-top:4px;">We received your message</div>
      </div>

      <div style="padding:22px;">
        <p style="margin:0 0 12px; font-size:15px; line-height:1.5;">
          Hey ${firstName} — thanks for reaching out${
            companyName ? ` about <strong>${companyName}</strong>` : ""
          }.
        </p>

        <p style="margin:0 0 12px; font-size:15px; line-height:1.5;">
          Here's a copy of your submission. If you have any extra context you want us to consider, feel free to reply directly to this email.
        </p>

        <div style="margin:18px 0; padding:14px; background:#f9fafb; border:1px solid #e5e7eb; border-radius:12px;">
          <div style="font-size:12px; font-weight:700; color:#374151; margin-bottom:8px;">Submission summary</div>
          <div style="font-size:14px; color:#111827; line-height:1.6;">
            <div><strong>Company:</strong> ${companyName || "—"}</div>
            <div><strong>Website:</strong> ${website}</div>
            <div><strong>Services:</strong> ${servicesList}</div>
          </div>
        </div>

        ${
          details
            ? `
          <div style="margin:18px 0; padding:14px; background:#f9fafb; border:1px solid #e5e7eb; border-radius:12px;">
            <div style="font-size:12px; font-weight:700; color:#374151; margin-bottom:6px;">Details</div>
            <div style="font-size:14px; color:#111827; white-space:pre-wrap; line-height:1.5;">${details}</div>
          </div>
        `
            : ""
        }

        <div style="margin-top:18px; font-size:13px; color:#6b7280; line-height:1.5;">
          <div>— Katoa</div>
          <div>Ads for Good</div>
        </div>
      </div>

      <div style="padding:16px 22px; border-top:1px solid #e5e7eb; font-size:12px; color:#6b7280;">
        If you didn’t submit this form, you can ignore this email.
      </div>
    </div>
  </div>
  `;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      firstLast,
      email,
      companyName,
      companyWebsite,
      services,
      details,
      sourceLabel,
      pageUrl,
      marketingConsent,
    } = body ?? {};

    // Basic validation
    if (!firstLast || !companyName) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields." },
        { status: 400 }
      );
    }

    // Normalize + validate email (once)
    const replyToEmail =
      typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!replyToEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(replyToEmail)) {
      return NextResponse.json(
        { ok: false, error: "Missing or invalid email." },
        { status: 400 }
      );
    }

    // Grab user agent from headers (no IP storage)
    const userAgent = req.headers.get("user-agent") || null;

    const insertRow = {
      first_last: firstLast,
      company_name: companyName,
      company_website: companyWebsite || null,
      services: Array.isArray(services) ? services : [],
      details: details || null,
      source_label: sourceLabel || null,
      page_url: pageUrl || null,
      marketing_opt_in: Boolean(marketingConsent),
      user_agent: userAgent,
      email: replyToEmail,
    };

    console.log("[inquiry] about to insert into supabase");

    // Insert into Supabase
    const { data, error } = await supabase
      .from("website_inquiries")
      .insert([insertRow])
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    const firstName =
      typeof firstLast === "string" ? firstLast.trim().split(/\s+/)[0] : undefined;

    const servicesArray = normalizeServices(data?.services ?? services);

    // 1) Auto-reply to the user (HTML), non-blocking
    try {
      const html = buildAutoReplyHtml({
        firstName,
        companyName: data.company_name ?? companyName,
        companyWebsite: data.company_website ?? companyWebsite,
        services: servicesArray,
        details: data.details ?? details ?? undefined,
      });

      console.log("[inquiry] about to send email via resend");

      await resend.emails.send({
        to: replyToEmail,
        from: `Ads for Good <${process.env.FROM_EMAIL!}>`,
        subject: "We received your message",
        html,
        replyTo: process.env.FROM_EMAIL!,
      });
    } catch (emailError) {
      console.error("Resend auto-reply failed:", emailError);
    }

    // 2) Notify you on every submission (plaintext), non-blocking
    try {
      const subject = `New inquiry: ${data.company_name || "Unknown company"}`;

      const text = [
        `Name: ${data.first_last || firstLast}`,
        `Email: ${data.email || replyToEmail}`,
        `Company: ${data.company_name || companyName}`,
        `Website: ${data.company_website || companyWebsite || "—"}`,
        `Services: ${servicesArray.length ? servicesArray.join(", ") : "—"}`,
        `Source: ${data.source_label || sourceLabel || "—"}`,
        `Page URL: ${data.page_url || pageUrl || "—"}`,
        `Marketing Opt-In: ${data.marketing_opt_in ?? Boolean(marketingConsent)}`,
        ``,
        `Details:`,
        `${data.details || details || "—"}`,
        ``,
        `ID: ${data.id || "—"}`,
        `Submitted: ${data.created_at || "—"}`,
      ].join("\n");

      await resend.emails.send({
        to: "katoa@ads4good.com",
        from: `Ads for Good <${process.env.FROM_EMAIL!}>`,
        subject,
        text,
        replyTo: replyToEmail, // replying from your inbox replies to the submitter
      });
    } catch (notifyError) {
      console.error("Resend notify-to-you failed:", notifyError);
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Server error." },
      { status: 500 }
    );
  }
}





