import type { Metadata } from "next";
import ClientPortalHeader from "@/components/ClientPortalHeader";
import ClientPortalTabs from "@/components/ClientPortalTabs";

export const metadata: Metadata = {
  title: "Tigerbyte Digital Client Portal | ads for Good",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function TigerbyteDigitalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#f7f4ee] text-neutral-900">
      <div className="mx-auto w-full max-w-6xl px-4 py-6">
        <ClientPortalHeader
          portalTitle="Tigerbyte Digital's Client Portal"
          clientName="Tigerbyte Digital"
          brandName="ads for Good"
          brandLogoSrc="/images/ads4Good_Logo_500x500.png"
          clientLogoSrc="/images/TigerbyteDigitalLogo.avif"
        />
        <ClientPortalTabs />
        <section className="mt-6 pb-20">{children}</section>
      </div>
    </main>
  );
}
