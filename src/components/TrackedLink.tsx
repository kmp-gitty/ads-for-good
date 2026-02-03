"use client";

import Link from "next/link";

type Props = {
  href: string;
  service: string;
  location: string;
  className?: string;
  children: React.ReactNode;
};

export default function TrackedLink({
  href,
  service,
  location,
  className,
  children,
}: Props) {
  const onClick = () => {
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      window.gtag("event", "service_learn_click", {
        service_name: service,
        location,
      });
    }
  };

  return (
    <Link href={href} onClick={onClick} className={className}>
      {children}
    </Link>
  );
}

