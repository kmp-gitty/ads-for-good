import Link from "next/link";

export const metadata = {
  title: "Prompt Playground | ads for Good Admin",
  robots: { index: false, follow: false },
};

export default function PromptPlaygroundLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f7f4ee] text-neutral-900">
      <div className="mx-auto w-full max-w-7xl px-4 py-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-orange-500">
              ads for Good · Admin
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              <Link href="/internal/prompt-playground" className="hover:text-orange-700">
                Prompt Playground
              </Link>
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-neutral-500">
              Practice building + testing Moment Identity v2 prompts against a rich DOM
              without touching a real client&apos;s storefront. Prompts fire under the
              isolated{" "}
              <span className="font-mono font-semibold text-orange-700">
                chapter_practice
              </span>{" "}
              tenant.
            </p>
          </div>
          <div className="flex items-center gap-4 text-sm text-neutral-600">
            <Link
              href="/internal/identity-prompts/chapter_practice"
              className="hover:text-neutral-900"
            >
              Configure prompts →
            </Link>
            <Link href="/internal/demo" className="hover:text-neutral-900">
              Demo playground →
            </Link>
            <Link href="/internal/tenants" className="hover:text-neutral-900">
              Tenants →
            </Link>
          </div>
        </header>
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}
