import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";

import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SleeperAgent — overnight research brief",
  description: "SleeperAgent: schedule Tensorlake research and read Supabase findings before the market opens.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${outfit.variable}`}>
      <body className={`${outfit.className} antialiased`}>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
