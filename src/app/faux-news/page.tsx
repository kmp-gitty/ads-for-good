"use client";

import React, { useEffect, useMemo, useRef } from "react";

/**
 * Faux Unified Pixel shim:
 * - Safe if your real pixel isn't loaded yet.
 * - Replace with your real pixel later (same API shape).
 */
declare global {
  interface Window {
    UnifiedPixel?: {
      track: (event: string, props?: Record<string, any>) => void;
      identify?: (props: Record<string, any>) => void;
    };
  }
}

function track(event: string, props: Record<string, any> = {}) {
  try {
    // 1) Optional local shim / real pixel API (what you're using in DevTools)
    const fn = window.UnifiedPixel?.track;
    if (typeof fn === "function") fn(event, props);

    // 2) Always POST to the collector (Supabase persistence)
    fetch("/api/pixel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true, // helps for unload/page_exit
      body: JSON.stringify({
        client_key: "adsforgood_local",
        vertical: "PUBLISHER_NEWS",
        event_name: event,
        page_url: window.location.href,
        page_path: window.location.pathname,
        referrer: document.referrer,
        props,
      }),
    }).catch(() => {});

    return true;
  } catch {
    return false;
  }
}


/** Small helpers */
function preventNav(e: React.MouseEvent) {
  e.preventDefault();
  e.stopPropagation();
}

function fmtRead(mins: number) {
  return `${mins} MIN READ`;
}

type Story = {
  id: string;
  category: string;
  title: string;
  readMins: number;
  imageUrl?: string;
  kicker?: string;
  author?: string;
};

type FeaturedAuthor = {
  id: string;
  name: string;
  headline: string;
  avatarUrl: string;
};

export default function FauxNewsHomePage() {
  // --- Fake data (edit freely)
  const topStrip = useMemo<Story[]>(
    () => [
      {
        id: "strip-1",
        category: "AI",
        title:
          "A founder is building a new AI company — and says the hardest part is distribution",
        readMins: 2,
      },
      {
        id: "strip-2",
        category: "MARKETS",
        title:
          "Investors are rotating into an overlooked corner of the market — here’s why",
        readMins: 2,
      },
      {
        id: "strip-3",
        category: "FINANCE",
        title:
          "A billionaire predicted an ‘army’ of builders would spread AI — now it’s happening",
        readMins: 2,
      },
      {
        id: "strip-4",
        category: "TECH",
        title:
          "A platform is cracking down on deepfake-style copyright misuse — what it means",
        readMins: 2,
      },
    ],
    []
  );

  const hero = useMemo<Story>(
    () => ({
      id: "hero-1",
      category: "LIFESTYLE",
      title:
        "A woman built her mom a $33,000 tiny home on family property. Here are 5 things she learned.",
      readMins: 6,
      imageUrl: "https://picsum.photos/seed/faux-hero/1200/800",
      kicker: "REAL LIFE",
    }),
    []
  );

  const midList = useMemo<Story[]>(
    () => [
      {
        id: "mid-1",
        category: "CULTURE",
        title:
          "The art of the squeal: what we can learn from the flood of AI resignation letters",
        readMins: 9,
        imageUrl: "https://picsum.photos/seed/faux-mid-1/420/280",
      },
      {
        id: "mid-2",
        category: "HOUSING",
        title:
          "20 big cities that may become affordable in 2026, according to a new index",
        readMins: 5,
        imageUrl: "https://picsum.photos/seed/faux-mid-2/420/280",
      },
      {
        id: "mid-3",
        category: "MARKETS",
        title: "A famous investor was an enigma. Now he’s an open book.",
        readMins: 4,
        imageUrl: "https://picsum.photos/seed/faux-mid-3/420/280",
      },
    ],
    []
  );

  const featured = useMemo<FeaturedAuthor[]>(
    () => [
      {
        id: "fa-1",
        name: "Amanda Hoover",
        headline:
          "Mocktails, potato balls, and 10 bots: My cringe Valentine’s date at the AI wine bar",
        avatarUrl: "https://i.pravatar.cc/96?img=32",
      },
      {
        id: "fa-2",
        name: "Katie Notopoulos",
        headline:
          "Meta apparently thinks we’re too distracted to care about facial recognition and smart glasses",
        avatarUrl: "https://i.pravatar.cc/96?img=48",
      },
      {
        id: "fa-3",
        name: "Dan DeFrancesco",
        headline:
          "A CEO’s joke landed at the worst possible time — and now everyone’s talking about it",
        avatarUrl: "https://i.pravatar.cc/96?img=12",
      },
    ],
    []
  );

  // --- Engagement tracking: time on page + scroll depth
  const startTs = useRef<number>(Date.now());
  const maxScrollPctRef = useRef<number>(0);

  const sent25 = useRef(false);
  const sent50 = useRef(false);
  const sent75 = useRef(false);
  const sent90 = useRef(false);

  const rafPending = useRef(false);

  useEffect(() => {
    track("page_view", {
      page_type: "faux_content_home",
      page_title: "Faux News Homepage",
      path: window.location.pathname,
      referrer: document.referrer,
      url: window.location.href,
    });

    const calcAndFireScroll = () => {
      const doc = document.documentElement;
      const scrollTop = doc.scrollTop;
      const scrollHeight = doc.scrollHeight - doc.clientHeight;
      const pct =
        scrollHeight > 0
          ? Math.min(100, Math.round((scrollTop / scrollHeight) * 100))
          : 0;

      if (pct > maxScrollPctRef.current) maxScrollPctRef.current = pct;

      if (pct >= 25 && !sent25.current) {
        sent25.current = true;
        track("scroll_depth", { percent: 25, page_type: "faux_content_home" });
      }
      if (pct >= 50 && !sent50.current) {
        sent50.current = true;
        track("scroll_depth", { percent: 50, page_type: "faux_content_home" });
      }
      if (pct >= 75 && !sent75.current) {
        sent75.current = true;
        track("scroll_depth", { percent: 75, page_type: "faux_content_home" });
      }
      if (pct >= 90 && !sent90.current) {
        sent90.current = true;
        track("scroll_depth", { percent: 90, page_type: "faux_content_home" });
      }
    };

    const onScroll = () => {
      if (rafPending.current) return;
      rafPending.current = true;

      requestAnimationFrame(() => {
        rafPending.current = false;
        calcAndFireScroll();
      });
    };

    const onVisChange = () => {
      track("visibility_change", {
        state: document.visibilityState,
        elapsed_ms: Date.now() - startTs.current,
        page_type: "faux_content_home",
      });
    };

    const onBeforeUnload = () => {
      track("page_exit", {
        elapsed_ms: Date.now() - startTs.current,
        max_scroll_pct: maxScrollPctRef.current,
        page_type: "faux_content_home",
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVisChange);
    window.addEventListener("beforeunload", onBeforeUnload);

    // initial scroll calculation
    calcAndFireScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisChange);
      window.removeEventListener("beforeunload", onBeforeUnload);

      // also send on unmount
      track("page_exit", {
        elapsed_ms: Date.now() - startTs.current,
        max_scroll_pct: maxScrollPctRef.current,
        page_type: "faux_content_home",
      });
    };
  }, []);

  // --- UI action handlers
  const handleNavClick = (label: string) => (e: React.MouseEvent) => {
    preventNav(e);
    track("nav_click", { label, page_type: "faux_content_home" });
  };

  const handleSubscribe = (e: React.MouseEvent) => {
    preventNav(e);
    track("cta_click", {
      cta: "subscribe",
      placement: "top_nav",
      page_type: "faux_content_home",
    });
  };

  const handleStoryClick =
    (story: Story, placement: string) => (e: React.MouseEvent) => {
      preventNav(e);
      track("story_click", {
        story_id: story.id,
        category: story.category,
        title: story.title,
        placement,
        page_type: "faux_content_home",
      });
    };

  const handleFollow = (author: FeaturedAuthor) => (e: React.MouseEvent) => {
    preventNav(e);
    track("follow_click", {
      author_id: author.id,
      author_name: author.name,
      page_type: "faux_content_home",
    });
  };

  const handleBurger = (e: React.MouseEvent) => {
    preventNav(e);
    track("menu_click", { placement: "top_nav", page_type: "faux_content_home" });
  };

  const handleMockLink =
    (label: string, meta: Record<string, any> = {}) =>
    (e: React.MouseEvent) => {
      preventNav(e);
      track("link_click", { label, ...meta, page_type: "faux_content_home" });
    };

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div
              className="text-2xl font-black tracking-tight"
              onClick={handleMockLink("brand_click")}
              role="button"
              tabIndex={0}
            >
              BUSINESS INSIDER
            </div>
          </div>

          <nav className="hidden items-center gap-6 text-sm font-semibold text-neutral-700 md:flex">
            <a href="#" onClick={handleNavClick("Markets")} className="hover:text-neutral-950">
              Markets
            </a>
            <a href="#" onClick={handleNavClick("Finance")} className="hover:text-neutral-950">
              Finance
            </a>
            <a href="#" onClick={handleNavClick("Tech")} className="hover:text-neutral-950">
              Tech
            </a>
            <a href="#" onClick={handleNavClick("AI")} className="hover:text-neutral-950">
              AI
            </a>
            <a href="#" onClick={handleNavClick("Lifestyle")} className="hover:text-neutral-950">
              Lifestyle
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSubscribe}
              className="inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-neutral-100"
            >
              <span aria-hidden>↗</span>
              Subscribe
            </button>
            <button
              onClick={handleBurger}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-neutral-300 hover:bg-neutral-100"
              aria-label="Open menu"
              title="Menu"
            >
              <span className="text-xl leading-none">≡</span>
            </button>
          </div>
        </div>

        {/* Category strip */}
        <div className="border-t border-neutral-200">
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-0 px-4 md:grid-cols-4">
            {topStrip.map((s) => (
              <a
                key={s.id}
                href="#"
                onClick={handleStoryClick(s, "top_strip")}
                className="border-b border-neutral-200 py-4 md:border-b-0 md:border-r md:border-neutral-200 md:px-4"
              >
                <div className="text-xs font-bold tracking-wide text-neutral-500">
                  {s.category} <span className="font-semibold">{fmtRead(s.readMins)}</span>
                </div>
                <div className="mt-2 text-sm font-semibold leading-snug text-neutral-900 hover:underline">
                  {s.title}
                </div>
              </a>
            ))}
          </div>
        </div>
      </header>

      {/* Main layout */}
      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-8 lg:grid-cols-12">
        {/* Left + Center */}
        <section className="lg:col-span-8">
          {/* Hero */}
          <a
            href="#"
            onClick={handleStoryClick(hero, "hero")}
            className="group block overflow-hidden rounded-xl border border-neutral-200 bg-white"
          >
            <div className="relative aspect-[16/9] w-full overflow-hidden bg-neutral-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={hero.imageUrl}
                alt=""
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                onLoad={() => track("image_load", { story_id: hero.id, placement: "hero" })}
              />
            </div>

            <div className="p-5">
              <div className="text-xs font-bold tracking-wide text-neutral-500">
                {hero.kicker ?? hero.category} <span className="ml-2 font-semibold">{fmtRead(hero.readMins)}</span>
              </div>
              <h1 className="mt-2 text-2xl font-extrabold leading-tight tracking-tight md:text-3xl">
                {hero.title}
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-neutral-700">
                This is a fake story card — it doesn’t navigate anywhere, but clicking it fires a tracking event.
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  onClick={(e) => {
                    preventNav(e);
                    track("cta_click", { cta: "read_more", placement: "hero_card" });
                  }}
                  className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
                >
                  Read more
                </button>
                <button
                  onClick={(e) => {
                    preventNav(e);
                    track("cta_click", { cta: "save_story", placement: "hero_card" });
                  }}
                  className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-neutral-100"
                >
                  Save
                </button>
              </div>
            </div>
          </a>

          {/* Mid stories */}
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
            {midList.map((s, idx) => (
              <a
                key={s.id}
                href="#"
                onClick={handleStoryClick(s, "mid_grid")}
                onMouseEnter={() => track("story_hover", { story_id: s.id, placement: "mid_grid", index: idx })}
                className="group flex gap-4 rounded-xl border border-neutral-200 bg-white p-4 hover:bg-neutral-50"
              >
                <div className="min-w-[110px] overflow-hidden rounded-lg bg-neutral-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={s.imageUrl}
                    alt=""
                    className="h-[82px] w-[110px] object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    onLoad={() => track("image_load", { story_id: s.id, placement: "mid_grid" })}
                  />
                </div>

                <div className="flex-1">
                  <div className="text-xs font-bold tracking-wide text-neutral-500">
                    {s.category} <span className="ml-2 font-semibold">{fmtRead(s.readMins)}</span>
                  </div>
                  <div className="mt-1 text-sm font-semibold leading-snug group-hover:underline">
                    {s.title}
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={(e) => {
                        preventNav(e);
                        track("cta_click", { cta: "open_story", placement: "mid_grid_card", story_id: s.id });
                      }}
                      className="rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-neutral-100"
                    >
                      Open
                    </button>
                    <button
                      onClick={(e) => {
                        preventNav(e);
                        track("cta_click", { cta: "share_story", placement: "mid_grid_card", story_id: s.id });
                      }}
                      className="rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-neutral-100"
                    >
                      Share
                    </button>
                  </div>
                </div>
              </a>
            ))}
          </div>

          {/* Faux “more links” section */}
          <div className="mt-10 rounded-xl border border-neutral-200 bg-white p-5">
            <div className="text-sm font-extrabold">More for you</div>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <a
                  key={i}
                  href="#"
                  onClick={handleMockLink("more_for_you_click", { index: i })}
                  className="rounded-lg border border-neutral-200 px-4 py-3 text-sm font-semibold hover:bg-neutral-50"
                >
                  “Evergreen” story headline placeholder #{i + 1}
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* Right rail */}
        <aside className="lg:col-span-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <div className="text-lg font-extrabold">Featured</div>
              <a
                href="#"
                onClick={handleMockLink("featured_view_all")}
                className="text-sm font-semibold text-neutral-700 hover:underline"
              >
                View all
              </a>
            </div>

            <div className="mt-5 space-y-6">
              {featured.map((a, idx) => (
                <div key={a.id} className="border-b border-neutral-200 pb-6 last:border-b-0 last:pb-0">
                  <div className="flex items-start gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={a.avatarUrl}
                      alt=""
                      className="h-12 w-12 rounded-full border border-neutral-200 object-cover"
                      onLoad={() => track("avatar_load", { author_id: a.id, placement: "featured" })}
                    />

                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs font-extrabold tracking-wide text-neutral-500">
                          {a.name.toUpperCase()}
                        </div>
                        <button
                          onClick={handleFollow(a)}
                          className="inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-neutral-100"
                        >
                          <span aria-hidden>＋</span> Follow
                        </button>
                      </div>

                      <a
                        href="#"
                        onClick={handleMockLink("featured_story_click", { author_id: a.id, index: idx })}
                        onMouseEnter={() => track("featured_hover", { author_id: a.id, index: idx })}
                        className="mt-2 block text-sm font-semibold leading-snug hover:underline"
                      >
                        {a.headline}
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Faux widgets */}
            <div className="mt-8 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
              <div className="text-sm font-extrabold">Newsletter</div>
              <p className="mt-1 text-xs text-neutral-700">
                Fake signup form — submit fires tracking.
              </p>
              <form
                className="mt-3 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  track("newsletter_submit", { placement: "right_rail" });
                }}
              >
                <input
                  type="email"
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-300"
                  onFocus={() => track("input_focus", { field: "newsletter_email", placement: "right_rail" })}
                />
                <button
                  type="submit"
                  className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
                >
                  Join
                </button>
              </form>
            </div>
          </div>
        </aside>
      </main>

      <footer className="border-t border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 md:flex-row md:items-center md:justify-between">
          <div className="text-sm font-semibold text-neutral-700">
            Faux Content Site • Clicks & scroll are tracked • No navigation
          </div>
          <div className="flex flex-wrap gap-3 text-sm font-semibold text-neutral-700">
            <a href="#" onClick={handleMockLink("footer_link", { label: "About" })} className="hover:underline">
              About
            </a>
            <a href="#" onClick={handleMockLink("footer_link", { label: "Contact" })} className="hover:underline">
              Contact
            </a>
            <a href="#" onClick={handleMockLink("footer_link", { label: "Privacy" })} className="hover:underline">
              Privacy
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

