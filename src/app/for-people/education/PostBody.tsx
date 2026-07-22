"use client";

import ReactMarkdown from "react-markdown";

// Renders a blog post's markdown body with the agency site's styling.
export default function PostBody({ markdown }: { markdown: string }) {
  return (
    <div className="text-neutral-800">
      <ReactMarkdown
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
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
