import Link from "next/link";

export const metadata = {
  title: "Demo Playground | ads for Good Admin",
  robots: { index: false, follow: false },
};

export default function InternalDemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f7f4ee] text-neutral-900">
      <div className="mx-auto w-full max-w-7xl px-4 py-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-orange-500">
              ads for Good · Admin
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              <Link href="/internal/demo" className="hover:text-orange-700">
                Demo Playground
              </Link>
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-neutral-500">
              MI v2 preset showcase. Uses the seeded{" "}
              <span className="font-mono font-semibold text-orange-700">
                adsforgood_prod
              </span>{" "}
              tenant — perfect for sales-demo screen-shares. For BUILDING new
              prompts against an isolated tenant, use{" "}
              <Link
                href="/internal/prompt-playground"
                className="font-semibold text-orange-700 hover:underline"
              >
                Prompt Playground
              </Link>
              .
            </p>
          </div>
          <div className="flex items-center gap-4 text-sm text-neutral-600">
            <Link href="/internal/prompt-playground" className="hover:text-neutral-900">
              Prompt Playground →
            </Link>
            <Link href="/internal/identity-prompts/adsforgood_prod" className="hover:text-neutral-900">
              Configure prompts →
            </Link>
          </div>
        </header>
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}
