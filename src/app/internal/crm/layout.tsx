import Link from "next/link";

export const metadata = {
  title: "CRM | ads for Good Admin",
  robots: { index: false, follow: false },
};

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f7f4ee] text-neutral-900">
      <div className="mx-auto w-full max-w-7xl px-4 py-8">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-orange-500">
              ads for Good · Admin
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              <Link href="/internal/crm" className="hover:text-orange-700">
                CRM
              </Link>
            </h1>
          </div>
          <div className="flex items-center gap-4 text-sm text-neutral-600">
            <Link href="/internal/tasks" className="hover:text-neutral-900">
              Tasks →
            </Link>
            <Link href="/internal/client-portal-config" className="hover:text-neutral-900">
              Client Config →
            </Link>
            <Link href="/chapter" className="hover:text-neutral-900">
              Chapter →
            </Link>
          </div>
        </header>
        <section className="mt-8">{children}</section>
      </div>
    </main>
  );
}
