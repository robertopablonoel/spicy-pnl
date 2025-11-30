import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { PLProvider } from "@/context/PLContext";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Spicy Cubes - P&L Viewer",
  description: "Profit & Loss Statement Viewer",
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
