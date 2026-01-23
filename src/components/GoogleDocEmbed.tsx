"use client";

import { useEffect, useRef } from "react";

type GoogleDocEmbedProps = {
  src: string;
  height?: number; // px
};

export default function GoogleDocEmbed({ src, height = 600 }: GoogleDocEmbedProps) {
  const lastScrollY = useRef<number>(0);
  const isInteracting = useRef<boolean>(false);

  useEffect(() => {
    const onScroll = () => {
      if (!isInteracting.current) {
        lastScrollY.current = window.scrollY;
      }
    };

    const preventJump = () => {
      if (!isInteracting.current) return;

      // If the browser snapped upward, restore where user was
      // (small threshold so we don't fight intentional scroll)
      const diff = Math.abs(window.scrollY - lastScrollY.current);
      if (diff > 40) {
        window.scrollTo({ top: lastScrollY.current, left: 0, behavior: "auto" });
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("focusin", preventJump);
    window.addEventListener("resize", preventJump);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("focusin", preventJump);
      window.removeEventListener("resize", preventJump);
    };
  }, []);

  return (
    <div
      className="rounded-lg border border-neutral-200 bg-white p-4"
      onMouseEnter={() => {
        isInteracting.current = true;
        lastScrollY.current = window.scrollY;
      }}
      onMouseLeave={() => {
        isInteracting.current = false;
      }}
      onFocusCapture={() => {
        isInteracting.current = true;
        lastScrollY.current = window.scrollY;
      }}
      onBlurCapture={() => {
        isInteracting.current = false;
      }}
    >
      <iframe
        src={src}
        style={{ height, width: "100%" }}
        className="w-full rounded-md border border-neutral-100"
        frameBorder="0"
      />
    </div>
  );
}
