import type { Metadata } from "next";
import ClientPortalHeader from "@/components/ClientPortalHeader";
import ClientPortalTabs from "@/components/ClientPortalTabs";

export const metadata: Metadata = {
  title: "EOS Fabrics Client Portal | Ads for Good",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function EOSFabricsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <ClientPortalHeader
          portalTitle="EOS Fabrics' Client Portal"
          clientName="EOS Fabrics"
          brandName="ads for Good"
          brandLogoSrc="/images/ads4Good_Logo_500x500.png"
          clientLogoSrc="/images/EOS_Client_Photo.avif"
        />
        <ClientPortalTabs />
        <section className="mt-6">{children}</section>
      </div>
    </main>
  );
}
