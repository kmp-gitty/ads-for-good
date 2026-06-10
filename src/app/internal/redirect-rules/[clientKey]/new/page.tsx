import Link from "next/link";
import RuleForm from "../RuleForm";

export default async function NewRulePage({
  params,
}: {
  params: Promise<{ clientKey: string }>;
}) {
  const { clientKey } = await params;
  return (
    <>
      <p className="text-sm text-neutral-500">
        <Link href={`/internal/redirect-rules/${clientKey}`} className="hover:text-orange-700">
          ← {clientKey} rules
        </Link>
      </p>
      <h2 className="mt-1 text-lg font-semibold">New rule for <span className="font-mono">{clientKey}</span></h2>
      <div className="mt-6">
        <RuleForm client_key={clientKey} />
      </div>
    </>
  );
}
