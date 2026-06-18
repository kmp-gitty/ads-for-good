import Link from "next/link";

export const metadata = {
  title: "Outreach URL Builder | ads for Good Admin",
  robots: { index: false, follow: false },
};

export default function OutreachBuilderLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f7f4ee] text-neutral-900">
      <div className="mx-auto w-full max-w-4xl px-4 py-8">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-orange-500">
              ads for Good · Admin
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              <Link href="/internal/outreach-builder" className="hover:text-orange-700">
                Outreach URL Builder
              </Link>
            </h1>
          </div>
          <div className="flex items-center gap-4 text-sm text-neutral-600">
            <Link href="/internal/crm" className="hover:text-neutral-900">
              CRM →
            </Link>
            <Link href="/internal/inbox" className="hover:text-neutral-900">
              Inbox →
            </Link>
            <Link href="/internal/redirect-rules" className="hover:text-neutral-900">
              Rules →
            </Link>
          </div>
        </header>
        <section className="mt-8">{children}</section>
      </div>
    </main>
  );
}
