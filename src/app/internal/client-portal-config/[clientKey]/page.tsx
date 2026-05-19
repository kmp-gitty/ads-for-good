import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import ClientForm from "../_components/ClientForm";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

export const dynamic = "force-dynamic";

type Params = Promise<{ clientKey: string }>;
type Search = Promise<{ saved?: string }>;

export default async function EditClientPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const { clientKey } = await params;
  const sp = await searchParams;

  const { data, error } = await supabase
    .schema("crm")
    .from("clients")
    .select("*")
    .eq("client_key", clientKey)
    .maybeSingle();

  if (error) {
    return (
      <div className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-800">
        Failed to load client: {error.message}
      </div>
    );
  }
  if (!data) notFound();

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            href="/internal/client-portal-config"
            className="text-xs text-neutral-600 hover:text-neutral-900"
          >
            ← Back to all clients
          </Link>
          <h2 className="mt-1 text-xl font-semibold text-neutral-900">
            Edit: {data.business_name}
          </h2>
        </div>
        <Link
          href={`/for-clients/${data.business_name.replace(/\s+/g, "-")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-orange-600 hover:text-orange-800"
        >
          View portal ↗
        </Link>
      </div>

      {sp.saved === "1" && (
        <div className="mb-4 rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-800">
          Saved.
        </div>
      )}

      <ClientForm initial={data} isNew={false} />
    </>
  );
}
