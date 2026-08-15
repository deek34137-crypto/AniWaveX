import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
