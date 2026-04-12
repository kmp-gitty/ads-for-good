"use client";

type SmoothScrollButtonProps = {
  targetId: string;
  className?: string;
  children: React.ReactNode;
};

export default function SmoothScrollButton({
  targetId,
  className,
  children,
}: SmoothScrollButtonProps) {
  const handleClick = () => {
    const el = document.getElementById(targetId);
    if (!el) return;

    const y = el.getBoundingClientRect().top + window.scrollY - 110;

    window.scrollTo({
      top: y,
      behavior: "smooth",
    });
  };

  return (
    <button type="button" onClick={handleClick} className={className}>
      {children}
    </button>
  );
}