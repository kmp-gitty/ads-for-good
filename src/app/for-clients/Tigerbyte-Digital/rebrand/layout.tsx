// src/app/for-clients/Tigerbyte-Digital/rebrand/layout.tsx
export default function RebrandLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return (
      <div className="tb-theme">
        {children}
      </div>
    );
  }