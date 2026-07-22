"use client";

import { useState } from "react";
import Link from "next/link";
import { POSTS, postImage } from "./posts";

const POSTS_PER_LOAD = 8;

// Blog topic taxonomy (the filter chips). Keep in sync with BlogCategory.
const CATEGORIES = ["Attribution Fundamentals", "Data & Tracking", "Measurement Strategy"];

export default function EducationClient() {
  const [visibleCount, setVisibleCount] = useState(POSTS_PER_LOAD);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);

  const filteredPosts =
    selectedTopics.length === 0 ? POSTS : POSTS.filter((p) => selectedTopics.includes(p.category));
  const visiblePosts = filteredPosts.slice(0, visibleCount);
  const canLoadMore = visibleCount < filteredPosts.length;

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(prev + POSTS_PER_LOAD, filteredPosts.length));
  };

  const toggleTopic = (cat: string) => {
    setVisibleCount(POSTS_PER_LOAD);
    setSelectedTopics((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
  };
  const clearTopics = () => {
    setSelectedTopics([]);
    setVisibleCount(POSTS_PER_LOAD);
  };

  return (
    <main className="bg-[#f7f4ee] text-neutral-900 px-4 pt-16 pb-24 flex justify-center">
      <div className="w-full max-w-6xl grid gap-10 md:grid-cols-[minmax(0,2.5fr)_minmax(0,1fr)]">
        {/* LEFT: Main content (blog tiles) */}
        <section>
          {/* Page title */}
          <header className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-orange-500">
              Education: our blog about the ad industry
            </h1>
            <p className="mt-4 text-neutral-700 max-w-2xl text-sm sm:text-base">
              A plain-language look behind the curtain of advertising, data, and how all sorts of ad types operate — built for people to understand, not marketing jargon.
            </p>
          </header>

          {/* Tiles grid */}
          {filteredPosts.length === 0 && (
            <div className="rounded-3xl border-2 border-dashed border-orange-100 bg-orange-50/30 p-10 text-center text-sm text-neutral-600">
              No articles in these topics yet — check back soon.
            </div>
          )}
          <div className="grid gap-6 md:grid-cols-2">
            {visiblePosts.map((post) => (
              <Link
                key={post.slug}
                href={`/for-people/education/${post.slug}`}
                className="group flex flex-col rounded-3xl bg-orange-50/40 border-2 border-orange-100 overflow-hidden shadow-sm transition hover:shadow-md hover:border-orange-200"
              >
                {/* Top media area */}
                <div className="relative bg-neutral-200/60 h-40">
                  {postImage(post) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={postImage(post)} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-neutral-600">
                      Image / visual placeholder
                    </div>
                  )}
                  <div className="absolute bottom-2 right-2 rounded-full bg-white/90 px-3 py-1 text-[10px] font-medium text-neutral-700 shadow-sm">
                    {post.category}
                  </div>
                </div>

                {/* Bottom text area */}
                <div className="flex flex-1 flex-col bg-white px-5 py-4">
                  <p className="text-[11px] uppercase tracking-wide text-neutral-500">{post.date}</p>
                  <h2 className="mt-1 text-base font-semibold text-neutral-900">{post.title}</h2>
                  <p className="mt-2 text-sm text-neutral-700 line-clamp-3">{post.excerpt}</p>

                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-sm font-medium text-orange-500 group-hover:underline">Learn more</span>
                    <span className="text-lg transition group-hover:translate-x-0.5" aria-hidden="true">→</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Load more button */}
          {canLoadMore && (
            <div className="mt-10 flex justify-center">
              <button
                onClick={handleLoadMore}
                className="rounded-full border border-orange-200 bg-orange-50 px-5 py-2 text-sm font-medium text-neutral-900 hover:bg-orange-100 transition"
              >
                Load previous articles
              </button>
            </div>
          )}
        </section>

        {/* RIGHT: Sidebar (for future ads / callouts) */}
        <aside className="space-y-6">
          {/* Placeholder blocks you can customize later */}
          <div className="rounded-3xl border border-orange-700 bg-orange-50/60 px-5 py-4">
            <h3 className="text-sm font-semibold text-neutral-900">
              New to ads for Good?
            </h3>
            <p className="mt-2 text-xs text-neutral-700">
  Our profession is advertising, but got tired of the corporate fakeness and want to use what we know for Good.{" "}
  <Link href="/about" className="text-orange-500 hover:underline">
    Learn more about us here.
  </Link>
</p>
          </div>

          <div className="rounded-3xl border border-orange-700 bg-orange-50/60 px-5 py-4">
            <h3 className="text-sm font-semibold text-neutral-900">
              You may be a person, but also own a business?
            </h3>
            <p className="mt-2 text-xs text-neutral-700">
  We help businesses too. Want to learn how "the big guys" do marketing or just talk to someone about it?{" "}
  <Link href="/for-businesses" className="text-orange-500 hover:underline">
    Learn more here.
  </Link>
</p>
          </div>

          <div className="rounded-3xl border border-orange-700 bg-orange-50/60 px-5 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-neutral-900">Filter by topic</h3>
              {selectedTopics.length > 0 && (
                <button onClick={clearTopics} className="text-xs font-medium text-orange-500 hover:underline">
                  Clear
                </button>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => {
                const active = selectedTopics.includes(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => toggleTopic(cat)}
                    aria-pressed={active}
                    className={
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition " +
                      (active
                        ? "bg-orange-500 text-white border-orange-500"
                        : "bg-white text-neutral-700 border-orange-200 hover:bg-orange-100")
                    }
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
