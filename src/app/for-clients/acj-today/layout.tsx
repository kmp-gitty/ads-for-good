import type { Metadata } from "next";
import ClientPortalHeader from "@/components/ClientPortalHeader";
import ClientPortalTabs from "@/components/ClientPortalTabs";

export const metadata: Metadata = {
  title: "American Community Journals Client Portal | ads for Good",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function AcjTodayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-6">
        <ClientPortalHeader
          portalTitle="American Community Journals' Client Portal"
          clientName="American Community Journals"
          brandName="ads for Good"
          brandLogoSrc="/images/ads4Good_Logo_500x500.png"
          clientLogoSrc="/images/ACJ_logo_final.png"
        />
        <ClientPortalTabs />
        <section className="mt-6">{children}</section>
      </div>
    </main>
  );
}
