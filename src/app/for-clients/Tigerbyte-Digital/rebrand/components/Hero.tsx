import Link from "next/link";

export default function Hero() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-[1200px] px-6 py-16">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12 md:items-start">
          {/* Left */}
          <div className="md:col-span-6">
            <h1 className="text-5xl font-black leading-[0.98] tracking-tight text-black md:text-6xl">
              Website <br />
              Monetization <br />
              Experts
            </h1>

            <p className="mt-6 max-w-[48ch] text-base text-neutral-700">
              Trusted by publishers to increase ad revenue sustainably &amp;
              transparently.
            </p>

            <div className="mt-6 flex flex-wrap gap-4">
              <Link
                href="#"
                className="inline-flex items-center justify-center rounded-md bg-black px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
              >
                Free Monetization Advice
              </Link>

              <Link
                href="#"
                className="inline-flex items-center justify-center rounded-md border border-black bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-neutral-50"
              >
                See Examples
              </Link>
            </div>

            <p className="mt-6 max-w-[70ch] text-sm text-neutral-700">
              Increase your ad revenue while keeping full control. No black-box
              platforms. No revenue share. Just transparent, independent advice.
            </p>
          </div>

          {/* Right */}
          <div className="md:col-span-6">
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-8">
              <div className="flex items-start justify-between gap-6">
                {/* 40% with GIF inside */}
                <div className="relative">
                  <h2
                    className="text-[110px] leading-none font-black tracking-tight text-transparent bg-clip-text"
                    style={{
                      backgroundImage: "url('/tiger.gif')",
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  >
                    40%
                  </h2>
                </div>

                {/* Label */}
                <div className="pt-6">
                  <div className="text-sm font-semibold uppercase tracking-wide text-neutral-600">
                    Average Revenue Lift
                  </div>
                </div>
              </div>

              {/* Under-right 2-cell row */}
              <div className="mt-8 grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-neutral-200 bg-white p-4 text-center">
                  <div className="text-sm font-semibold text-neutral-900">
                    Certification Placeholder
                  </div>
                </div>
                <div className="rounded-xl border border-neutral-200 bg-white p-4 text-center">
                  <div className="text-sm font-semibold text-neutral-900">
                    Certification Placeholder
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* end Right */}
        </div>
      </div>
    </section>
  );
}