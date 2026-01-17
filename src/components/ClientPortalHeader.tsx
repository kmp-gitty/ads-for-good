export default function ClientPortalHeader() {
    return (
      <header className="flex items-center justify-between border-b border-neutral-200 pb-4">
        {/* Left: afG */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-orange-100 ring-1 ring-orange-200" />
          <div className="leading-tight">
            <div className="text-xs text-neutral-500">afG</div>
            <div className="text-sm font-semibold text-neutral-900">
              ads for Good
            </div>
          </div>
        </div>
  
        {/* Center: Portal Title */}
        <div className="text-center">
          <h1 className="text-lg font-semibold text-neutral-900">
            EOS Fabrics&apos; Client Portal
          </h1>
        </div>
  
        {/* Right: Client */}
        <div className="flex items-center gap-3">
          <div className="text-right leading-tight">
            <div className="text-xs text-neutral-500">Client</div>
            <div className="text-sm font-semibold text-neutral-900">
              EOS Fabrics
            </div>
          </div>
          <div className="h-10 w-10 rounded-md bg-neutral-100 ring-1 ring-neutral-200" />
        </div>
      </header>
    );
  }
  