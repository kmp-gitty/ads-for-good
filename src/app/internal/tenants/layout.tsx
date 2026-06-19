import Link from "next/link";

export const metadata = {
  title: "Tenants | ads for Good Admin",
  robots: { index: false, follow: false },
};

export default function TenantsLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f7f4ee] text-neutral-900">
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-orange-500">
              ads for Good · Admin
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              <Link href="/internal/tenants" className="hover:text-orange-700">
                Tenants
              </Link>
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              Manage agencies, allowed login domains, users, and client → agency assignments.
              Replaces operator-driven SQL for chapter_config.* tables.
            </p>
          </div>
          <div className="flex items-center gap-4 text-sm text-neutral-600">
            <Link href="/internal/identity-prompts" className="hover:text-neutral-900">Prompts →</Link>
            <Link href="/internal/redirect-rules" className="hover:text-neutral-900">Redirects →</Link>
            <Link href="/internal/inbox" className="hover:text-neutral-900">Inbox →</Link>
            <Link href="/internal/tasks" className="hover:text-neutral-900">Tasks →</Link>
            <Link href="/internal/client-portal-config" className="hover:text-neutral-900">Client Config →</Link>
          </div>
        </header>
        <div className="mt-8">{children}</div>
      </div>
    </main>
  );
}
