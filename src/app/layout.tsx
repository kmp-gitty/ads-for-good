import type { Metadata } from "next";
import "./globals.css";
import { Lexend } from "next/font/google";
import Script from "next/script";
import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";
import ConsentBanner from "@/components/ConsentBanner";


const lexend = Lexend({
  subsets: ["latin"],
  variable: "--font-lexend",
});

export const metadata: Metadata = {
  title: "ads for Good",
  description:
    "A for-profit company using advertising to fund community impact, protect privacy, and educate consumers.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Google tag (gtag.js) */}
        <Script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-3N64Z7ZSQK"
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-3N64Z7ZSQK');
          `}
        </Script>
      </head>

      <body
        className={`${lexend.variable} font-lexend bg-white text-neutral-900`}
      >
        <NavBar />
        {children}
        <Footer />
        <ConsentBanner />
      </body>
    </html>
  );
}


