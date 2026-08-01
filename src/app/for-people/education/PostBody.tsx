"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Renders a blog post's markdown body with the agency site's styling.
export default function PostBody({ markdown }: { markdown: string }) {
  return (
    <div className="text-neutral-800">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ children }) => (
            <h2 className="mt-10 mb-3 text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-8 mb-2 text-lg font-semibold text-neutral-900">{children}</h3>
          ),
          p: ({ children }) => (
            <p className="mb-4 text-[15px] sm:text-base leading-relaxed text-neutral-800">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="mb-5 space-y-2 pl-5 list-disc marker:text-orange-400">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-5 space-y-2 pl-5 list-decimal marker:text-orange-400">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="text-[15px] sm:text-base leading-relaxed text-neutral-800">{children}</li>
          ),
          a: ({ href, children }) => {
            // Same-site links (relative or ads4good.com / www.ads4good.com) open
            // in the same tab; everything else (incl. chapter.ads4good.com and
            // other domains) opens in a new tab.
            const external = !!href && !/^(\/|https?:\/\/(www\.)?ads4good\.com(\/|$|#))/i.test(href);
            return (
              <a href={href} className="font-medium text-orange-500 hover:underline" target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined}>
                {children}
              </a>
            );
          },
          strong: ({ children }) => <strong className="font-semibold text-neutral-900">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          blockquote: ({ children }) => (
            <blockquote className="my-5 border-l-4 border-orange-200 pl-4 text-neutral-700 italic">{children}</blockquote>
          ),
          // GFM tables — wrapped so they scroll horizontally on small screens
          // instead of breaking the layout on mobile.
          table: ({ children }) => (
            <div className="my-6 overflow-x-auto rounded-2xl border border-orange-100">
              <table className="w-full border-collapse text-left text-[13px] sm:text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-orange-50">{children}</thead>,
          th: ({ children }) => (
            <th className="border-b border-orange-100 px-3 py-2 align-top font-semibold text-neutral-900">{children}</th>
          ),
          td: ({ children }) => (
            <td className="border-b border-orange-50 px-3 py-2 align-top text-neutral-800">{children}</td>
          ),
          // Blog-body images. `alt` is the accessible/SEO text; an optional
          // markdown title — ![alt](/src "caption") — sets a distinct visible
          // caption, falling back to alt when omitted (back-compat).
          img: ({ src, alt, title }) => {
            const caption = (typeof title === "string" && title) || alt;
            const raw = typeof src === "string" ? src : "";
            // "#half" size hint — ![alt](/src#half "caption") renders at ~50%
            // width. The fragment is stripped from the actual image src.
            const half = raw.includes("#half");
            const cleanSrc = raw.replace("#half", "");
            return (
              <figure className={`my-6 mx-auto ${half ? "max-w-[14rem]" : "max-w-md"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cleanSrc}
                  alt={alt ?? ""}
                  loading="lazy"
                  className="w-full rounded-2xl border border-orange-100 shadow-sm"
                />
                {caption ? (
                  <figcaption className="mt-2 text-center text-xs text-neutral-500">{caption}</figcaption>
                ) : null}
              </figure>
            );
          },
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
