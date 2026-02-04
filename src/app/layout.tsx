import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Navigation from "@/components/Navigation";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Apparel Intel | Premium Athleisure Analytics",
  description: "Competitive intelligence dashboard tracking 12,000+ products across 6 major athleisure brands",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-socal-stone-50 text-socal-stone-800 min-h-screen`}
      >
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        <footer className="border-t border-socal-sand-200 py-8 mt-12 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-socal-stone-400 text-sm">
            <p>Data sourced from brand sitemaps. Updated daily.</p>
            <p className="mt-1 text-xs text-socal-stone-300">Premium Athleisure Intelligence by Apparel Intel</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
