import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Navigation from "@/components/Navigation";
import { SiteAuthProvider } from "@/components/SiteAuthProvider";
import { GymreapersProvider } from "./gymreapers/_lib/GymreapersProvider";
import { UsageTracker } from "@/components/UsageTracker";
import { ErrorCapture } from "@/components/ErrorCapture";

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
  title: "Gymreapers Data & Analytics",
  description: "Internal data, analytics, and competitive intelligence for Gymreapers. How we win the customer and the strength market.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gr-bg text-gr-text min-h-screen`}
      >
        <SiteAuthProvider>
          <UsageTracker />
          <ErrorCapture />
          <GymreapersProvider>
            <Navigation />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {children}
            </main>
            <footer className="border-t border-gr-border py-8 mt-12 bg-gr-surface">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gr-subtle text-sm">
                <p>Internal — Gymreapers Data &amp; Analytics. Unauthorized access prohibited.</p>
              </div>
            </footer>
          </GymreapersProvider>
        </SiteAuthProvider>
      </body>
    </html>
  );
}
