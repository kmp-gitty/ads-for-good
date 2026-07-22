import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { POSTS, getPost } from "../posts";
import PostBody from "../PostBody";
import BackToTop from "../BackToTop";

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return { title: "Post not found | ads for Good blog" };
  return {
    title: `${post.title} | ads for Good blog`,
    description: post.excerpt,
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  return (
    <main className="bg-[#f7f4ee] text-neutral-900 px-4 pt-12 pb-24 flex justify-center">
      <div className="w-full max-w-6xl grid gap-10 md:grid-cols-[minmax(0,2.5fr)_minmax(0,1fr)]">
        {/* LEFT: article */}
        <article>
          <Link href="/for-people/education" className="text-sm font-medium text-orange-500 hover:underline">
            ← Back to the blog
          </Link>

          <div className="mt-6 flex items-center gap-3">
            <span className="rounded-full bg-orange-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-orange-700">
              {post.category}
            </span>
            <span className="text-[11px] uppercase tracking-wide text-neutral-500">{post.date}</span>
          </div>

          <h1 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900">{post.title}</h1>

          <div className="mt-8">
            <PostBody markdown={post.body} />
          </div>

          <div className="mt-12 border-t border-orange-100 pt-6">
            <Link href="/for-people/education" className="text-sm font-medium text-orange-500 hover:underline">
              ← Back to the blog
            </Link>
          </div>
        </article>

        {/* RIGHT: sidebar — sticks alongside the article on desktop */}
        <aside className="space-y-6 md:sticky md:top-6 md:self-start">
          <div className="rounded-3xl border-2 border-orange-100 bg-orange-50/60 px-5 py-5">
            <h3 className="text-sm font-semibold text-neutral-900">See the whole journey, not the last click.</h3>
            <p className="mt-2 text-xs text-neutral-700">
              Chapter stitches a customer&rsquo;s whole path back together across every touch — so you measure people, not disagreeing dashboards.
            </p>
            <a
              href="https://chapter.ads4good.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block rounded-full bg-orange-500 px-4 py-2 text-xs font-semibold text-white hover:bg-orange-600 transition"
            >
              Learn about Chapter →
            </a>
          </div>

          <div className="rounded-3xl border border-orange-700 bg-orange-50/60 px-5 py-4">
            <h3 className="text-sm font-semibold text-neutral-900">New to ads for Good?</h3>
            <p className="mt-2 text-xs text-neutral-700">
              Our profession is advertising, but we got tired of the corporate fakeness and want to use what we know for Good.{" "}
              <Link href="/about" className="text-orange-500 hover:underline">Learn more about us here.</Link>
            </p>
          </div>

          <div className="rounded-3xl border border-orange-700 bg-orange-50/60 px-5 py-4">
            <h3 className="text-sm font-semibold text-neutral-900">You may be a person, but also own a business?</h3>
            <p className="mt-2 text-xs text-neutral-700">
              We help businesses too. Want to learn how &ldquo;the big guys&rdquo; do marketing or just talk to someone about it?{" "}
              <Link href="/for-businesses" className="text-orange-500 hover:underline">Learn more here.</Link>
            </p>
          </div>
        </aside>
      </div>

      <BackToTop />
    </main>
  );
}
