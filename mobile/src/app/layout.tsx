import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import MobileBottomNav from "@/components/MobileBottomNav";
import CommandPalette from "@/components/CommandPalette";
import HeartbeatProvider from "@/components/HeartbeatProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import MobileAppShell from "@/components/MobileAppShell";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0a0a0c",
};

export const metadata: Metadata = {
  title: "AniWaveX - Premium Anime Streaming",
  description: "Discover, track, and stream your favorite anime in high quality without interruptions.",
  openGraph: {
    title: "AniWaveX",
    description: "Discover, track, and stream your favorite anime in high quality without interruptions.",
    url: "https://aniwavex.com",
    siteName: "AniWaveX",
    images: [
      {
        url: "https://media.kitsu.io/anime/poster_images/1/large.jpg", // A fallback generic anime poster or logo
        width: 800,
        height: 600,
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AniWaveX - Premium Anime Streaming",
    description: "Discover, track, and stream your favorite anime in high quality without interruptions.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col pb-20 md:pb-0 bg-[#0a0a0c]">
        <MobileAppShell>
          <AuthProvider>
            <HeartbeatProvider />
            {children}
            <CommandPalette />
            <MobileBottomNav />
          </AuthProvider>
        </MobileAppShell>
      </body>
    </html>
  );
}
