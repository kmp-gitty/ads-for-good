import type { Metadata } from "next";
import ClientPortalHeader from "@/components/ClientPortalHeader";
import ClientPortalTabs from "@/components/ClientPortalTabs";
import ClientNotepadLauncher from "@/components/ClientNotepadLauncher";

export const metadata: Metadata = {
  title: "Projectagram Client Portal | Ads for Good",
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
  "https://docs.google.com/document/d/1eBaFIRbk0SA1FS8EpvG1_wnX_VTfD8Pr93w2J1CaV4g/edit?usp=sharing";

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <ClientPortalHeader
          portalTitle="Projectagram's Client Portal"
          clientName="Projectagram"
          brandName="ads for Good"
          brandLogoSrc="/images/ads4Good_Logo_500x500.png"
          clientLogoSrc="/images/ProjectagramLogo.jpg"
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
