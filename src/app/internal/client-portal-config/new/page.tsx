import Link from "next/link";
import ClientForm from "../_components/ClientForm";

export const dynamic = "force-dynamic";

export default function NewClientPage() {
  return (
    <>
      <div className="mb-6">
        <Link
          href="/internal/client-portal-config"
          className="text-xs text-neutral-600 hover:text-neutral-900"
        >
          ← Back to all clients
        </Link>
        <h2 className="mt-1 text-xl font-semibold text-neutral-900">New Client</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Pick a <code className="rounded bg-neutral-100 px-1 py-0.5 text-xs">client_key</code> carefully — it&apos;s
          the multi-tenant identity and can&apos;t be renamed later. Use snake_case (e.g. <code className="rounded bg-neutral-100 px-1 py-0.5 text-xs">acme_co</code>).
        </p>
      </div>

      <ClientForm isNew={true} />
    </>
  );
}
