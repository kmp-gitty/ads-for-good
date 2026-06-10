import Link from "next/link";

export const metadata = {
  title: "Offline events | ads for Good Admin",
  robots: { index: false, follow: false },
};

export default function OfflineEventsLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f7f4ee] text-neutral-900">
      <div className="mx-auto w-full max-w-5xl px-4 py-8">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-orange-500">
              ads for Good · Admin
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              <Link href="/internal/offline-events" className="hover:text-orange-700">
                Offline events
              </Link>
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              Upload an attendee CSV. Email + phone are hashed in-process. Raw PII is never persisted.
            </p>
          </div>
          <div className="flex items-center gap-4 text-sm text-neutral-600">
            <Link href="/internal/tasks" className="hover:text-neutral-900">Tasks →</Link>
            <Link href="/internal/redirect-rules" className="hover:text-neutral-900">Redirects →</Link>
            <Link href="/internal/client-portal-config" className="hover:text-neutral-900">Client Config →</Link>
          </div>
        </header>
        <div className="mt-8">{children}</div>
      </div>
    </main>
  );
}
