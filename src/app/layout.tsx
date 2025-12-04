import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { PLProvider } from "@/context/PLContext";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Investor Portal",
  description: "Viral content engine monetized through DTC wellness. $1.8M EBITDA run rate, 70M monthly views, 28% margins.",
  openGraph: {
    title: "Investment Opportunity",
    description: "Viral content engine monetized through DTC wellness. $1.8M EBITDA run rate, 70M monthly views.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Investment Opportunity",
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
      </body>
    </html>
  );
}
