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
        <div style="font-size:16px; font-weight:700; color:#111827;">Ads for Good</div>
        <div style="font-size:13px; color:#6b7280; margin-top:4px;">We received your message</div>
      </div>

      <div style="padding:22px;">
        <p style="margin:0 0 12px; font-size:15px; line-height:1.5;">
          Hey ${firstName} — thanks for reaching out${companyName ? ` about <strong>${companyName}</strong>` : ""}.
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
          <div style="margin:18px 0; padding:14px 14px; background:#f9fafb; border:1px solid #e5e7eb; border-radius:12px;">
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
      email, // ✅ NEW: required for auto-reply
      companyName,
      companyWebsite,
      services,
      details,
      sourceLabel,
      pageUrl,
      marketingConsent, // client field
    } = body ?? {};

    // Basic validation
    if (!firstLast || !companyName) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields." },
        { status: 400 }
      );
    }

    // Auto-reply requires a valid-ish email
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { ok: false, error: "Missing or invalid email." },
        { status: 400 }
      );
    }

    // Grab user agent (no IP storage)
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
      email: email.trim().toLowerCase(),

      // Optional: store submitter email if your table has a column for it
      // email: email,
    };

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

    // --- ✉️ Auto-reply to the user (HTML), non-blocking ---
    try {
      const firstName =
        typeof firstLast === "string" ? firstLast.trim().split(/\s+/)[0] : undefined;

        const servicesArray = Array.isArray(data.services)
        ? data.services
        : Array.isArray(services)
          ? services
          : [];
      
      const html = buildAutoReplyHtml({
        firstName,
        companyName: data.company_name ?? companyName,
        companyWebsite: data.company_website ?? companyWebsite,
        services: servicesArray,
        details: data.details ?? details ?? undefined,
      });

      const replyToEmail =
  typeof email === "string" ? email.trim().toLowerCase() : "";

if (!replyToEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(replyToEmail)) {
  return NextResponse.json(
    { ok: false, error: "Missing or invalid email." },
    { status: 400 }
  );
}

      await resend.emails.send({
        to: replyToEmail,
        from: `ads for Good <${process.env.FROM_EMAIL!}>`,
        subject: "We received your message",
        html,
        replyTo: process.env.FROM_EMAIL!, // lets them reply back to you
      });
    } catch (emailError) {
      console.error("Resend auto-reply failed:", emailError);
      // Do NOT fail submission
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Server error." },
      { status: 500 }
    );
  }
}




