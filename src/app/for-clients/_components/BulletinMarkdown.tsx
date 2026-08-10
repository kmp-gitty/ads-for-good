"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Small inline markdown renderer for bulletin task text + notes. Links open in
// a new tab; lists/emphasis render tight. Kept deliberately minimal so a bullet
// reads like a bullet, not a blog post.
export default function BulletinMarkdown({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ ...props }) => (
            <a
              {...props}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-teal-700 underline decoration-teal-300 underline-offset-2 hover:text-teal-800"
            />
          ),
          p: ({ ...props }) => <p {...props} className="m-0" />,
          ul: ({ ...props }) => <ul {...props} className="ml-4 list-disc space-y-0.5" />,
          ol: ({ ...props }) => <ol {...props} className="ml-4 list-decimal space-y-0.5" />,
          li: ({ ...props }) => <li {...props} className="marker:text-neutral-400" />,
          strong: ({ ...props }) => <strong {...props} className="font-semibold text-neutral-900" />,
          code: ({ ...props }) => (
            <code {...props} className="rounded bg-neutral-100 px-1 py-0.5 text-[0.85em]" />
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
