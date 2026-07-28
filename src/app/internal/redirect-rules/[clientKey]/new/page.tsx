import Link from "next/link";
import RuleForm from "../RuleForm";

const INK = "#1F2D43";
const MUTED = "#5C6B82";

export default async function NewRulePage({
  params,
}: {
  params: Promise<{ clientKey: string }>;
}) {
  const { clientKey } = await params;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Link
        href={`/internal/redirect-rules/${clientKey}`}
        style={{ fontSize: 13, color: MUTED, textDecoration: "none" }}
      >
        ← {clientKey} rules
      </Link>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: INK, margin: 0 }}>
        New rule for{" "}
        <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", color: MUTED, fontSize: 18 }}>
          {clientKey}
        </span>
      </h1>
      <RuleForm client_key={clientKey} />
    </div>
  );
}
