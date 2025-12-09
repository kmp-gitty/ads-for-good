import Link from "next/link";

export function Footer() {
  return (
    <footer className="w-full bg-orange-50 py-4">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6">
        
        {/* Left: Logo + Brand */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-white text-sm font-bold">
            afG
          </div>
          <span className="text-sm font-semibold text-neutral-900">
            ads for Good
          </span>
        </Link>

        {/* Middle: Footer nav items */}
        <div className="hidden md:flex items-center gap-10 text-sm text-neutral-700">
        <Link href="/for-people" className="hover:text-neutral-900 cursor-pointer">
    for People
  </Link>
          <Link href="/for-businesses" className="hover:text-neutral-900 cursor-pointer">
    for Businesses
  </Link>
  <Link href="/network" className="hover:underline hover:text-orange-500 transition">
    our Network
  </Link>
        </div>

        {/* Right: Contact Button */}
        <Link
          href="/contact"
          className="text-sm font-medium rounded-full px-4 py-1.5 bg-orange-500 text-white hover:bg-orange-600"
        >
          Contact
        </Link>
      </div>
    </footer>
  );
}

