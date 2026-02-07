import type { Metadata } from "next";
import ClientPortalHeader from "@/components/ClientPortalHeader";
import ClientPortalTabs from "@/components/ClientPortalTabs";
import ClientNotepadLauncher from "@/components/ClientNotepadLauncher";

export const metadata: Metadata = {
  title: "Tigerbyte Digital Client Portal | Ads for Good",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function ProjectagramLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  const NOTEPAD_URL =
  "https://docs.google.com/document/d/10AZChXtrbVydznyUxrIS7acfYw7rByCSLkMwRc0QdUs/edit?usp=sharing";

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <ClientPortalHeader
          portalTitle="Tigerbyte Digital's Client Portal"
          clientName="Tigerbyte Digital"
          brandName="ads for Good"
          brandLogoSrc="/images/ads4Good_Logo_500x500.png"
          clientLogoSrc="/images/TigerbyteDigitalLogo.avif"
        />
        <div className="mt-4 flex flex-wrap items-center gap-2">
  <ClientPortalTabs />
  <div className="ml-auto mt-[14px]">
    <ClientNotepadLauncher docUrl={NOTEPAD_URL} />
  </div>
</div>
        <section className="mt-6">{children}</section>
      </div>
    </main>
  );
}
