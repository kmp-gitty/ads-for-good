import Image from "next/image";

const logos = [
  { src: "/CommunityAdvocate.avif", alt: "Partner 1" },
  { src: "/Webby_Logo.avif", alt: "Partner 2" },
  { src: "/bullish.avif", alt: "Partner 3" },
  { src: "/careerbliss.avif", alt: "Partner 4" },
  { src: "/peekyou.avif", alt: "Partner 5" },
  { src: "/WaveScout.jpg", alt: "Partner 6" },
  { src: "/StyleBlueprint.jpg", alt: "Partner 7" },
  { src: "/positivity.jpg", alt: "Partner 8" },
  { src: "/aperture.jpg", alt: "Partner 9" },
];

export default function ProudPartners() {
  return (
    <section className="bg-[#F6F3EF]">
      <div className="mx-auto max-w-[1200px] px-6 py-20">
        <div className="text-center">
          <h2 className="text-4xl font-black tracking-tight text-black">
            Proud Partners With:
          </h2>
          <div className="mx-auto mt-6 h-1 w-14 bg-black" />
        </div>

        <div className="mt-14 grid grid-cols-2 gap-x-10 gap-y-12 md:grid-cols-3">
          {logos.map((l) => (
            <div
              key={l.src}
              className="flex items-center justify-center"
            >
              <div className="relative h-16 w-[240px]">
                <Image
                  src={l.src}
                  alt={l.alt}
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 40vw, 240px"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}