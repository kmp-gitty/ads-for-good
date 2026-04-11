import type { Metadata } from "next";
import "./globals.css";
import Script from "next/script";
import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";
import ConsentBanner from "@/components/ConsentBanner";
import ChapterLoader from "@/components/ChapterLoader";
import { Geist, Geist_Mono } from "next/font/google";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
  className={`${geistSans.variable} ${geistMono.variable} antialiased bg-stone-900`}
>
        <NavBar />
        {children}
        <Footer />
        <ConsentBanner />
        <ChapterLoader />
      </body>
    </html>
  );
}


