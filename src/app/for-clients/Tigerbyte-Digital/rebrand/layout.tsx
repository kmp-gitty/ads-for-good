// src/app/for-clients/Tigerbyte-Digital/rebrand/layout.tsx
export default function RebrandLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return (
      <div className="min-h-screen bg-white text-neutral-900">
        {children}
      </div>
    );
  }