"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  connectBrandedDomain,
  refreshBrandedDomain,
  disconnectBrandedDomain,
  emailDomainInstructions,
  type BrandedDomainInfo,
} from "./_actions";
import { normalizeHost, isLikelyHost, previewDnsRecords } from "@/app/lib/vercel/dns-preview";
import type { DnsRecord } from "@/app/lib/vercel/domains";

const INK = "#1F2D43";
const MUTED = "#5C6B82";
const FAINT = "#8A98AD";
const ORANGE = "#E36410";
const LINE = "#E5E0D4";
const PANEL = "#FBFAF6";
const GREEN = "#2E7D5B";

export default function DomainClient({
  clientKey,
  initial,
}: {
  clientKey: string;
  initial: BrandedDomainInfo | null;
}) {
  const [info, setInfo] = useState<BrandedDomainInfo | null>(initial);
  const [host, setHost] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [connecting, startConnect] = useTransition();
  const [refreshing, startRefresh] = useTransition();
  const [disconnecting, startDisconnect] = useTransition();
  const [copied, setCopied] = useState<string | null>(null);

  const [techEmail, setTechEmail] = useState("");
  const [techNote, setTechNote] = useState("");
  const [sending, startSend] = useTransition();
  const [sentMsg, setSentMsg] = useState<string | null>(null);

  const cleanHost = normalizeHost(host);
  const hostValid = isLikelyHost(cleanHost) && !cleanHost.endsWith(".vercel.app") && cleanHost !== "ads4good.com";
  const previewDns = hostValid ? previewDnsRecords(cleanHost) : [];

  const connect = () => {
    setError(null);
    startConnect(async () => {
      const res = await connectBrandedDomain(host);
      if (!res.ok) { setError(res.error); return; }
      setInfo(res.info);
      setHost("");
    });
  };
  const refresh = () => {
    setError(null);
    startRefresh(async () => {
      const res = await refreshBrandedDomain();
      if (!res.ok) { setError(res.error); return; }
      setInfo(res.info);
    });
  };
  const disconnect = () => {
    setError(null);
    startDisconnect(async () => {
      const res = await disconnectBrandedDomain();
      if (!res.ok) { setError(res.error); return; }
      setInfo(null);
    });
  };
  const sendInstructions = () => {
    setSentMsg(null);
    startSend(async () => {
      const res = await emailDomainInstructions(techEmail, techNote, info ? undefined : cleanHost);
      if (!res.ok) { setSentMsg(res.error); return; }
      setSentMsg("sent");
      setTechEmail("");
      setTechNote("");
    });
  };
  const copyVal = async (v: string) => {
    try { await navigator.clipboard.writeText(v); setCopied(v); setTimeout(() => setCopied(null), 1600); } catch { /* ignore */ }
  };

  const verified = info?.status === "verified";

  return (
    <div style={{ padding: "28px 30px 60px", maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: INK, margin: "0 0 4px" }}>Branded domain</h1>
      <p style={{ fontSize: 14, color: MUTED, margin: "0 0 22px", lineHeight: 1.5 }}>
        Smart Links run on your own domain — <code style={mono}>go.yourbrand.com/spring-sale</code>. Set it up once in three
        steps: create a subdomain, connect it here, then make your first link.
      </p>

      {/* ---------- Not connected: create subdomain + connect ---------- */}
      {!info && (
        <>
          <StepCard n={1} title="Create your subdomain">
            <p style={{ fontSize: 13, color: MUTED, margin: "0 0 10px", lineHeight: 1.5 }}>
              Pick a subdomain of a site you own — we recommend <code style={mono}>go.</code>, e.g.{" "}
              <code style={mono}>go.yourbrand.com</code>. Then add the DNS record below at your domain provider to create it.
            </p>
            <input value={host} onChange={(e) => setHost(e.target.value)} placeholder="go.yourbrand.com" style={{ ...inp, maxWidth: 320 }} />

            {hostValid ? (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: INK, marginBottom: 6 }}>
                  Add this record at your DNS provider:
                </div>
                <DnsTable dns={previewDns} copied={copied} onCopy={copyVal} />
                <RegistrarTips host={cleanHost} />
                <HandoffBlock
                  techEmail={techEmail}
                  techNote={techNote}
                  sending={sending}
                  sentMsg={sentMsg}
                  onEmail={(e) => setTechEmail(e)}
                  onNote={(n) => setTechNote(n)}
                  onSend={sendInstructions}
                />
              </div>
            ) : (
              cleanHost.length > 0 && (
                <div style={{ fontSize: 12.5, color: FAINT, marginTop: 8 }}>
                  Enter a full subdomain like <code style={mono}>go.yourbrand.com</code>.
                </div>
              )
            )}
          </StepCard>

          <StepCard n={2} title="Connect it here">
            <p style={{ fontSize: 13, color: MUTED, margin: "0 0 12px", lineHeight: 1.5 }}>
              Added the record (or ready to)? Connect and we&rsquo;ll register your subdomain and check the DNS. You can
              connect right away — DNS can finish propagating in the background.
            </p>
            <button type="button" onClick={connect} disabled={connecting || !hostValid} style={{ ...btnPrimary, opacity: connecting || !hostValid ? 0.6 : 1 }}>
              {connecting ? "Connecting…" : "Connect subdomain"}
            </button>
            {error && <div style={{ fontSize: 12.5, color: "#B3261E", marginTop: 10 }}>{error}</div>}
          </StepCard>
        </>
      )}

      {/* ---------- Connected ---------- */}
      {info && (
        <>
          <div
            style={{
              border: `1px solid ${verified ? GREEN + "44" : ORANGE + "44"}`,
              background: verified ? "#EEF6F1" : "#FFF4EC",
              borderRadius: 12,
              padding: "14px 18px",
              marginBottom: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: verified ? GREEN : ORANGE }}>
                {verified ? "● Live" : "○ Waiting for DNS"}
              </div>
              <div style={{ fontSize: 13, color: MUTED, marginTop: 3 }}>
                <code style={mono}>{info.host}</code>
                {verified ? " is connected and serving your links." : " — add the DNS record below, then check again."}
              </div>
            </div>
            {!verified && (
              <button type="button" onClick={refresh} disabled={refreshing} style={btn}>
                {refreshing ? "Checking…" : "Check status"}
              </button>
            )}
          </div>

          {error && <div style={{ fontSize: 12.5, color: "#B3261E", marginBottom: 12 }}>{error}</div>}

          {!verified && info.dns.length > 0 && (
            <div style={card}>
              <div style={{ fontSize: 15, fontWeight: 700, color: INK, marginBottom: 4 }}>Add this DNS record</div>
              <p style={{ fontSize: 13, color: MUTED, margin: "0 0 12px", lineHeight: 1.5 }}>
                At your DNS provider (where you manage the domain), add the record below. Changes can take a few minutes to a
                few hours, then hit <strong>Check status</strong>.
              </p>
              <DnsTable dns={info.dns} copied={copied} onCopy={copyVal} />
              <RegistrarTips host={info.host} />
              <HandoffBlock
                techEmail={techEmail}
                techNote={techNote}
                sending={sending}
                sentMsg={sentMsg}
                onEmail={(e) => setTechEmail(e)}
                onNote={(n) => setTechNote(n)}
                onSend={sendInstructions}
              />
            </div>
          )}

          {verified && (
            <div style={card}>
              <div style={{ fontSize: 15, fontWeight: 700, color: INK, marginBottom: 6 }}>Your links now use this domain</div>
              <p style={{ fontSize: 13, color: MUTED, margin: "0 0 8px", lineHeight: 1.5 }}>New and existing links are reachable at:</p>
              <div style={{ background: "#0F1722", color: "#E6EAF0", borderRadius: 10, padding: "12px 14px", fontSize: 13.5, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                https://{info.host}/<span style={{ color: "#F0A66A" }}>your-link</span>
              </div>
              <p style={{ fontSize: 12, color: FAINT, marginTop: 8 }}>
                The generic <code style={mono}>ads4good.com/r/{clientKey || "…"}/…</code> address keeps working too.
              </p>
              <Link href={`/chapter/${clientKey}/links/new`} style={{ display: "inline-block", marginTop: 14, background: ORANGE, color: "white", fontSize: 13.5, fontWeight: 600, textDecoration: "none", padding: "9px 18px", borderRadius: 8 }}>
                Create your first link →
              </Link>
            </div>
          )}

          <button type="button" onClick={disconnect} disabled={disconnecting} style={{ ...btn, color: "#B3261E", borderColor: "#E3B7B2" }}>
            {disconnecting ? "Disconnecting…" : "Disconnect domain"}
          </button>
        </>
      )}
    </div>
  );
}

function DnsTable({ dns, copied, onCopy }: { dns: DnsRecord[]; copied: string | null; onCopy: (v: string) => void }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
        <thead>
          <tr>{["Type", "Name / Host", "Value", ""].map((h) => <th key={h} style={th}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {dns.map((r, i) => (
            <tr key={i}>
              <td style={td}><code style={mono}>{r.type}</code></td>
              <td style={td}><code style={mono}>{r.name}</code></td>
              <td style={{ ...td, wordBreak: "break-all" }}><code style={mono}>{r.value}</code></td>
              <td style={td}>
                <button type="button" onClick={() => onCopy(r.value)} style={{ ...btnSmall, background: copied === r.value ? GREEN : "white", color: copied === r.value ? "white" : INK }}>
                  {copied === r.value ? "Copied" : "Copy"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RegistrarTips({ host }: { host: string }) {
  const label = host.split(".").slice(0, host.split(".").length - 2).join(".") || "go";
  return (
    <details style={{ marginTop: 10 }}>
      <summary style={{ fontSize: 12.5, color: ORANGE, fontWeight: 600, cursor: "pointer" }}>Where do I add this?</summary>
      <div style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.6, marginTop: 8, background: PANEL, border: `1px solid ${LINE}`, borderRadius: 8, padding: "10px 12px" }}>
        Sign in to whoever manages your domain&rsquo;s DNS — usually your registrar or web host
        (GoDaddy, Namecheap, Cloudflare, Squarespace, Google Domains, Wix…). Find <strong>DNS</strong> /
        <strong> DNS Records</strong> / <strong>Manage DNS</strong> and <strong>Add a record</strong>:
        <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
          <li>Set <strong>Type</strong> and <strong>Value</strong> exactly as shown above.</li>
          <li>For <strong>Name / Host</strong>, enter just <code style={mono}>{label}</code> (some providers want the full <code style={mono}>{host}</code> — either is fine).</li>
          <li>Leave <strong>TTL</strong> at its default and save.</li>
        </ul>
      </div>
    </details>
  );
}

function HandoffBlock({
  techEmail, techNote, sending, sentMsg, onEmail, onNote, onSend,
}: {
  techEmail: string; techNote: string; sending: boolean; sentMsg: string | null;
  onEmail: (v: string) => void; onNote: (v: string) => void; onSend: () => void;
}) {
  return (
    <div style={{ border: `1px dashed ${LINE}`, borderRadius: 10, padding: 16, marginTop: 14, background: PANEL }}>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: INK, marginBottom: 3 }}>Not the technical one?</div>
      <p style={{ fontSize: 12.5, color: MUTED, margin: "0 0 10px", lineHeight: 1.5 }}>
        Email this record to your web person and they can add it for you. Replies come straight back to you.
      </p>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input type="email" value={techEmail} onChange={(e) => onEmail(e.target.value)} placeholder="webmaster@yourbrand.com" style={{ ...inp, maxWidth: 260 }} />
        <button type="button" onClick={onSend} disabled={sending || !techEmail.trim()} style={{ ...btnPrimary, opacity: sending || !techEmail.trim() ? 0.6 : 1 }}>
          {sending ? "Sending…" : "Email steps"}
        </button>
        {sentMsg === "sent" && <span style={{ fontSize: 12.5, color: GREEN, fontWeight: 600 }}>Sent ✓</span>}
        {sentMsg && sentMsg !== "sent" && <span style={{ fontSize: 12.5, color: "#B3261E" }}>{sentMsg}</span>}
      </div>
      <input value={techNote} onChange={(e) => onNote(e.target.value)} placeholder="Optional note to include" style={{ ...inp, marginTop: 8 }} />
    </div>
  );
}

function StepCard({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span style={{ width: 22, height: 22, borderRadius: 999, background: PANEL, border: `1px solid ${LINE}`, color: INK, fontSize: 12, fontWeight: 700, display: "grid", placeItems: "center" }}>{n}</span>
        <span style={{ fontSize: 15, fontWeight: 700, color: INK }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

const mono: React.CSSProperties = { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: "0.92em" };
const card: React.CSSProperties = { border: `1px solid ${LINE}`, borderRadius: 12, padding: 20, marginBottom: 16, background: "white" };

const inp: React.CSSProperties = {
  boxSizing: "border-box", width: "100%", fontSize: 14, color: INK, background: "white",
  border: `1px solid ${LINE}`, borderRadius: 8, padding: "9px 11px",
};
const btn: React.CSSProperties = {
  fontSize: 12.5, fontWeight: 600, color: INK, background: "white",
  border: `1px solid ${LINE}`, borderRadius: 8, padding: "7px 14px", cursor: "pointer",
};
const btnSmall: React.CSSProperties = {
  fontSize: 11.5, fontWeight: 600, border: `1px solid ${LINE}`, borderRadius: 6, padding: "4px 10px", cursor: "pointer",
};
const btnPrimary: React.CSSProperties = {
  fontSize: 13.5, fontWeight: 600, color: "white", background: ORANGE, border: "none",
  borderRadius: 8, padding: "9px 18px", cursor: "pointer",
};
const th: React.CSSProperties = {
  textAlign: "left", padding: "8px 10px", borderBottom: `1px solid ${LINE}`, background: PANEL,
  fontSize: 11.5, color: MUTED, fontWeight: 600,
};
const td: React.CSSProperties = {
  padding: "8px 10px", borderBottom: `1px solid ${LINE}`, color: INK, verticalAlign: "top",
};
