import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { PLProvider } from "@/context/PLContext";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Deal Overview",
  description: "Viral content engine monetized through DTC wellness. $1.8M EBITDA run rate, 70M monthly views, 28% margins.",
  openGraph: {
    title: "Deal Overview",
    description: "Viral content engine monetized through DTC wellness. $1.8M EBITDA run rate, 70M monthly views.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Deal Overview",
    description: "Viral content engine monetized through DTC wellness. $1.8M EBITDA run rate, 70M monthly views.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased bg-slate-100`}>
        <PLProvider>
          {children}
        </PLProvider>
        <Script
          src="//embed.typeform.com/next/embed.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
