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

      splitbillsfairly: {
        title: "Split Bills Fairly",
        description: (
          <div className="space-y-4">
            <p>
              <span className="font-semibold">What:</span>{" "}
              Split Bills Failry is a free calculator that divides any kind of group bill by 2 methods: even split or itemized split (different people paid for different things). This micro-site
              is perfect for a group restaurant bill, friends traveling expenses, roomate shared spend, and more.
            </p>
      
            <p>
              <span className="font-semibold">Why:</span>{" "}
              We want to combine: for-good mission, web & marketing profession, and short attention
              spans. We research and build satellite websites that fulfill every day needs
              while keeping our creative and technical skills flowing.
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
                Read more about the for Good stuff we do here.
              </a>
            </p>
      
            <p>
              We also have a genuine passion for food & friends, so we think building
              something useful to our daily lives is pretty cool.
            </p>
          </div>
        ),
        url: "https://splitbillsfairly.com",
      },

      calculateovertimepay: {
        title: "Overtime Pay Calculator",
        description: (
          <div className="space-y-4">
            <p>
              <span className="font-semibold">What:</span>{" "}
              Our overtime calculator is free and easy to use. Calculate: hourly rates, expected overtime pay, normal pay, and total pay. You have the option to calculate in $USD, £GBP, €EUR, $CAD, $AUD, or ￥YEN. Also find in-depth info of the US Fair Labor Standards Act (FLSA), & summary of other country OT laws.
            </p>
      
            <p>
              <span className="font-semibold">Why:</span>{" "}
              We want our company to be: good, useful, and fun. We find and fulfill every day needs
              while keeping our creative and technical skills flowing by creating new websites for them.
            </p>
      
            <p>
              <span className="font-semibold">for Good:</span>{" "}
              We give 20% of revenue from this site (and all others)
              to community and non-profit organizations.{" "}
              <a
                href="https://www.ads4good.com/for-good"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-orange-500 underline underline-offset-4 hover:text-orange-600"
              >
                Read more about "for Good" here.
              </a>
            </p>
      
            <p>
              We also have been in hourly retail jobs, decided if taking the overtime is worth it - making something useful for this felt right.
            </p>
          </div>
        ),
        url: "https://calculateovertimepay.com",
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



