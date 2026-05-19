import Link from "next/link";

export const metadata = {
  title: "Client Portal Config | ads for Good Admin",
  robots: { index: false, follow: false },
};

export default function ClientPortalConfigLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#f7f4ee] text-neutral-900">
      <div className="mx-auto w-full max-w-5xl px-4 py-8">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-orange-500">
              ads for Good · Admin
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              <Link href="/internal/client-portal-config" className="hover:text-orange-700">
                Client Portal Config
              </Link>
            </h1>
          </div>
          <Link
            href="/chapter"
            className="text-sm text-neutral-600 hover:text-neutral-900"
          >
            ← Chapter Dashboard
          </Link>
        </header>
        <section className="mt-8">{children}</section>
      </div>
    </main>
  );
}
