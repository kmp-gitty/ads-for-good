import type { Metadata } from "next";
import "./globals.css";
import { Lexend } from "next/font/google";
import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";

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
      <body
        className={`${lexend.variable} font-lexend bg-white text-neutral-900`}
      >
        <NavBar />
        {children}
        <Footer />
      </body>
    </html>
  );
}

