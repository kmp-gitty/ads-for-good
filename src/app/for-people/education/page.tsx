"use client";

import { useState } from "react";
import Link from "next/link";

type Post = {
  id: number;
  title: string;
  date: string;
  category: string;
  excerpt: string;
};

const POSTS_PER_LOAD = 8;

// Placeholder posts – edit these later
const posts: Post[] = [
  {
    id: 1,
    title: "First Post Coming Soon",
    date: "Dec 08, 2025",
    category: "Advertising Industry",
    excerpt:
      "A plain-language overview of the advertising industry: what that means, who makes it up, and how it impacts consumers.",
  }
];

export default function EducationPage() {
  const [visibleCount, setVisibleCount] = useState(POSTS_PER_LOAD);

  const visiblePosts = posts.slice(0, visibleCount);
  const canLoadMore = visibleCount < posts.length;

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(prev + POSTS_PER_LOAD, posts.length));
  };

  return (
    <main className="bg-white text-neutral-900 px-4 pt-16 pb-24 flex justify-center">
      <div className="w-full max-w-6xl grid gap-10 md:grid-cols-[minmax(0,2.5fr)_minmax(0,1fr)]">
        {/* LEFT: Main content (blog tiles) */}
        <section>
          {/* Page title */}
          <header className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-orange-500">
              Education
            </h1>
            <p className="mt-4 text-neutral-700 max-w-2xl text-sm sm:text-base">
              A plain-language look behind the curtain of advertising, data, and how all sorts of ad types operate — built for people to understand, not marketing jargon.
            </p>
          </header>

          {/* Tiles grid */}
          <div className="grid gap-6 md:grid-cols-2">
            {visiblePosts.map((post) => (
              <article
                key={post.id}
                className="flex flex-col rounded-3xl bg-orange-50/40 border border-orange-100 overflow-hidden shadow-sm"
              >
                {/* Top media area (image placeholder) */}
                <div className="relative bg-neutral-200/60 h-40">
                  {/* You can swap this for a real <Image> later */}
                  <div className="flex h-full w-full items-center justify-center text-xs text-neutral-600">
                    Image / visual placeholder
                  </div>

                  {/* Small badge (like 99.9% uptime) */}
                  <div className="absolute bottom-2 right-2 rounded-full bg-white/90 px-3 py-1 text-[10px] font-medium text-neutral-700 shadow-sm">
                    {post.category}
                  </div>
                </div>

                {/* Bottom text area */}
                <div className="flex flex-1 flex-col bg-white px-5 py-4">
                  <p className="text-[11px] uppercase tracking-wide text-neutral-500">
                    {post.date}
                  </p>
                  <h2 className="mt-1 text-base font-semibold text-neutral-900">
                    {post.title}
                  </h2>
                  <p className="mt-2 text-sm text-neutral-700 line-clamp-3">
                    {post.excerpt}
                  </p>

                  {/* Learn more row */}
                  <div className="mt-4 flex items-center justify-between">
                    <Link
                      href="#"
                      className="text-sm font-medium text-orange-500 hover:underline"
                    >
                      Learn more
                    </Link>
                    <span className="text-lg" aria-hidden="true">
                      →
                    </span>
                  </div>
                </div>
              </article>
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
          <div className="rounded-3xl border border-orange-100 bg-orange-50/60 px-5 py-4">
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

          <div className="rounded-3xl border border-orange-100 bg-orange-50/60 px-5 py-4">
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

          <div className="rounded-3xl border border-orange-100 bg-orange-50/60 px-5 py-4">
            <h3 className="text-sm font-semibold text-neutral-900">
              Popular Topics
            </h3>
            <ul className="mt-2 space-y-1 text-xs text-neutral-700 list-disc list-inside">
              <li>How advertising works</li>
              <li>Privacy and data</li>
              <li>Industry news and impact to consumers</li>
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}
