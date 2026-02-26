"use client";

type Testimonial = {
  title: string;
  quote: string;
};

const testimonials: Testimonial[] = [
  {
    title: "Fitness and Health Client",
    quote:
      "TIGERBYTE was extremely knowledgable, readily available, had great communication throughout the entire process, and met all deadlines. Will hire them again for help in ad serving in the future.",
  },
  {
    title: "Watersport & Recreation Client",
    quote:
      "TIGERBYTE constantly demonstrated their expertise with maximizing ad revenue by recommending and implementing effective monetization strategies. They are extremely responsive; able to quickly assess opportunities and develop effective solutions; provided great communication throughout and clearly has a grasp of the metrics important to advertisers.",
  },
  {
    title: "Oil & Manufacturing Client",
    quote:
      "TIGERBYTE is a pleasure to work with. We hired them to help us get our Google Ad Manager account set up correctly and to show us how to set up some new ad types. They are very knowledgeable and responsive. We are very satisfied with the project outcome. I highly recommend them if their skill set meets your needs.",
  },
  {
    title: "Youth Education Client",
    quote:
      "TIGERBYTE was a complete pleasure to work with. They were available immediately to do the work and took time to explain everything. I will definitely be using TIGERBYTE again!",
  },
  {
    title: "Education Client",
    quote:
      "TIGERBYTE did a great job for us and we would hire them again in a heartbeat. They knew exactly what we needed, how to do it, and completed the job quickly.",
  },
  {
    title: "Career Building Client",
    quote:
      "TIGERBYTE has a great understanding of digital media, especially Google Ad Manager. They are excellent communicators and executed all projects in a timely and efficient manner.",
  },
  {
    title: "Education Client",
    quote:
      "We used TIGERBYTE to do some consulting on how to set up our Ad Manager Account. They were helpful and thoroughly answered our questions. Would highly recommend working with them.",
  },
];

export default function TestimonialFlipStrip() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-[1200px] px-6 pb-16">
        {/* thin row feel */}
        <div className="flex gap-4 overflow-x-auto pb-3">
          {testimonials.map((t, i) => (
            <FlipTile key={`${t.title}-${i}`} title={t.title} quote={t.quote} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FlipTile({ title, quote }: { title: string; quote: string }) {
    return (
      <div className="w-full min-w-[260px] max-w-[340px]">
        {/* Stable hover target */}
        <div className="group [perspective:1200px]">
          {/* Card container clips overflow so text never bleeds out */}
          <div className="relative h-[200px] w-full overflow-hidden rounded-xl border border-neutral-200 bg-white">
            {/* Rotator flips based on group hover */}
            <div className="absolute inset-0 transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
              {/* Front */}
              <div className="absolute inset-0 p-6 [backface-visibility:hidden] pointer-events-none">
                <h3 className="text-lg font-black leading-snug text-black text-center">
                  {title}
                </h3>
  
               
              </div>
  
              {/* Back */}
<div className="absolute inset-0 p-6 [transform:rotateY(180deg)] [backface-visibility:hidden] pointer-events-none">
  <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500 text-center">
    Testimonial
  </div>

  {/* Scrollable quote area */}
  <div className="mt-4 h-[120px] overflow-y-auto pr-2 pointer-events-auto">
    <p className="text-sm leading-relaxed text-neutral-800">
      “{quote}”
    </p>
  </div>
</div>
            </div>
          </div>
        </div>
      </div>
    );
  }