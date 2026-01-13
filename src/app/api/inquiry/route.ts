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

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      firstLast,
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

   // --- 🔔 Send notification email (non-blocking) ---
try {
    // Coerce services into an array for email formatting
    const servicesArray: string[] = (() => {
      const s: any = data.services;
  
      if (Array.isArray(s)) return s;
  
      // If services comes back as a JSON string like '["SEO","PPC"]'
      if (typeof s === "string") {
        const trimmed = s.trim();
  
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) return parsed;
        } catch {
          // If it's a plain string like "SEO, PPC"
          if (trimmed.length) return trimmed.split(",").map((x) => x.trim()).filter(Boolean);
        }
  
        return [];
      }
  
      return [];
    })();
  
    const subject = `New website inquiry: ${data.company_name}`;
  
    const text = [
      `Name: ${data.first_last}`,
      `Company: ${data.company_name}`,
      `Website: ${data.company_website || "—"}`,
      `Services: ${servicesArray.join(", ") || "—"}`,
      ``,
      `Details:`,
      `${data.details || "—"}`,
      ``,
      `Source: ${data.source_label || "—"}`,
      `Page URL: ${data.page_url || "—"}`,
      `Marketing Opt-In: ${data.marketing_opt_in}`,
      ``,
      `Submitted: ${data.created_at}`,
      `ID: ${data.id}`,
    ].join("\n");
  
    await resend.emails.send({
      to: process.env.NOTIFY_EMAIL!,
      from: process.env.FROM_EMAIL!,
      subject,
      text,
    });
  } catch (emailError) {
    console.error("Resend notification failed:", emailError);
  }
  

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Server error." },
      { status: 500 }
    );
  }
}



