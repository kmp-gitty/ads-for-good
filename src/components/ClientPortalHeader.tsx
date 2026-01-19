import Image from "next/image";

type ClientPortalHeaderProps = {
  portalTitle?: string;
  clientName?: string;
  brandName?: string;

  // Optional logos (served from /public, e.g. "/images/afg-logo.png")
  brandLogoSrc?: string;
  clientLogoSrc?: string;

  // Optional sizing tweaks (defaults match your current placeholders)
  brandLogoAlt?: string;
  clientLogoAlt?: string;
  brandLogoSize?: number; // px (square)
  clientLogoSize?: number; // px (square)
};

export default function ClientPortalHeader({
  portalTitle = "Client-Name Client Portal",
  clientName = "Client Name",
  brandName = "ads for Good",

  brandLogoSrc,
  clientLogoSrc,

  brandLogoAlt = "Ads for Good logo",
  clientLogoAlt,

  brandLogoSize = 40,
  clientLogoSize = 40,
}: ClientPortalHeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-neutral-200 pb-4">
      {/* Left: afG */}
      <div className="flex items-center gap-3">
        {brandLogoSrc ? (
          <Image
            src={brandLogoSrc}
            alt={brandLogoAlt}
            width={brandLogoSize}
            height={brandLogoSize}
            className="rounded-full ring-1 ring-orange-200 object-contain bg-white"
            priority
          />
        ) : (
          <div className="h-10 w-10 rounded-full bg-orange-100 ring-1 ring-orange-200" />
        )}

        <div className="leading-tight">
          <div className="text-xs text-neutral-500">afG</div>
          <div className="text-sm font-semibold text-neutral-900">
            {brandName}
          </div>
        </div>
      </div>

      {/* Center: Portal Title */}
      <div className="text-center">
        <h1 className="text-lg font-semibold text-neutral-900">{portalTitle}</h1>
      </div>

      {/* Right: Client */}
      <div className="flex items-center gap-3">
        <div className="text-right leading-tight">
          <div className="text-xs text-neutral-500">Client</div>
          <div className="text-sm font-semibold text-neutral-900">
            {clientName}
          </div>
        </div>

        {clientLogoSrc ? (
          <Image
            src={clientLogoSrc}
            alt={clientLogoAlt ?? `${clientName} logo`}
            width={clientLogoSize}
            height={clientLogoSize}
            className="rounded-md ring-1 ring-neutral-200 object-contain bg-white"
          />
        ) : (
          <div className="h-10 w-10 rounded-md bg-neutral-100 ring-1 ring-neutral-200" />
        )}
      </div>
    </header>
  );
}

  