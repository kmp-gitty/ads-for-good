import Link from "next/link";

type SatellitePage = {
    title: string;
    description: React.ReactNode;
    url: string;
  };

const SATELLITE_PAGES: Record<string, SatellitePage> = {
    steps2miles: {
        title: "Steps2Miles",
        description: (
          <div className="space-y-4">
            <p>
              <span className="font-semibold">What:</span>{" "}
              Steps2Miles is a free calculator that converts steps to miles using
              multiple methods, based on how accurate you’d like to be. This micro-site
              also contains general step length and distance information, along with
              options to convert results into kilometers, meters, or yards.
            </p>
      
            <p>
              <span className="font-semibold">Why:</span>{" "}
              Going back to our mission, profession, and admittedly short attention
              span, we research and build niche websites that fulfill real search needs
              while keeping our creative and technical skills sharp.
            </p>
      
            <p>
              <span className="font-semibold">for Good:</span>{" "}
              We pledge 20% of revenue from this site (and all others in our network)
              to community and non-profit organizations.{" "}
              <a
                href="https://www.ads4good.com/for-good"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-orange-500 underline underline-offset-4 hover:text-orange-600"
              >
                Read more about the for Good part of our business here.
              </a>
            </p>
      
            <p>
              We also have a genuine passion for fitness and movement, so building
              something in this space felt like a natural fit.
            </p>
          </div>
        ),
        url: "https://steps2miles.com",
      },
//Copy above and paste below for new satellite sites      
};

export default async function NetworkDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: rawSlug } = await params;

  const slug = decodeURIComponent(rawSlug).trim().toLowerCase();
  const page = SATELLITE_PAGES[slug];

  if (!page) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-white">
        <main className="px-4 py-16">
          <div className="mx-auto max-w-3xl">
            <h1 className="text-2xl font-semibold text-black">Site not found</h1>

            {/* Debug line (optional) */}
            <p className="mt-2 text-sm text-slate-500">Debug slug: {slug}</p>

            <p className="mt-2 text-slate-700">
              This network page doesn’t exist yet.
            </p>

            <Link
              href="/network"
              className="mt-6 inline-block font-medium text-orange-600 hover:underline"
            >
              ← Back to Network
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    // min-h + flex makes footer stick to bottom even if content is short
    <div className="min-h-[calc(100vh-64px)] bg-white flex flex-col">
      <main className="flex-1 px-4 py-16">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight text-orange-600">
            {page.title}
          </h1>

          <div className="mt-4 text-slate-900">{page.description}</div>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={page.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-orange-600 px-5 py-2 text-sm font-medium text-white hover:bg-orange-700"
            >
              Visit {page.title} →
            </a>

            <Link
              href="/network"
              className="rounded-full border border-orange-200 bg-orange-50 px-5 py-2 text-sm font-medium text-slate-900 hover:bg-orange-100"
            >
              Back to Network
            </Link>
          </div>
        </div>
      </main>

      {/* Footer pinned to bottom */}
      <footer className="border-t border-orange-100 py-6 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} ads for Good • our Network
      </footer>
    </div>
  );
}



