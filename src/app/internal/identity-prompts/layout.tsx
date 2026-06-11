import Link from "next/link";

export const metadata = {
  title: "Identity prompts | ads for Good Admin",
  robots: { index: false, follow: false },
};

export default function IdentityPromptsLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f7f4ee] text-neutral-900">
      <div className="mx-auto w-full max-w-5xl px-4 py-8">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-orange-500">
              ads for Good · Admin
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              <Link href="/internal/identity-prompts" className="hover:text-orange-700">
                Identity prompts
              </Link>
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              Configurable on-site popups that capture identity in exchange for a discount or offer. Fires via the Chapter pixel.
            </p>
          </div>
          <div className="flex items-center gap-4 text-sm text-neutral-600">
            <Link href="/internal/redirect-rules" className="hover:text-neutral-900">Redirects →</Link>
            <Link href="/internal/offline-events" className="hover:text-neutral-900">Offline →</Link>
            <Link href="/internal/tasks" className="hover:text-neutral-900">Tasks →</Link>
            <Link href="/internal/client-portal-config" className="hover:text-neutral-900">Client Config →</Link>
          </div>
        </header>
        <div className="mt-8">{children}</div>
      </div>
    </main>
  );
}
