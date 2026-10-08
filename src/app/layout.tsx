import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import MobileBottomNav from "@/components/MobileBottomNav";
import CommandPalette from "@/components/CommandPalette";
import SpatialNavigationProvider from "@/components/SpatialNavigationProvider";
import { AuthProvider } from "@/providers/AuthProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0a0c",
};

import { SITE_CONFIG, getAbsoluteUrl } from "@/lib/seo/site-config";
import { JsonLd, createWebSiteSchema, createOrganizationSchema } from "@/lib/seo/jsonld";
import NotificationManager from "@/components/NotificationManager";
import NavigationProgress from "@/components/NavigationProgress";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_CONFIG.siteUrl),
  title: {
    default: "AniWaveX — Premium Anime Streaming & Manga Discovery",
    template: "%s | AniWaveX",
  },
  description: SITE_CONFIG.description,
  alternates: {
    canonical: getAbsoluteUrl("/"),
  },
  openGraph: {
    title: "AniWaveX — Premium Anime Streaming & Discovery",
    description: SITE_CONFIG.description,
    url: SITE_CONFIG.siteUrl,
    siteName: SITE_CONFIG.name,
    images: [
      {
        url: SITE_CONFIG.ogImage,
        width: 1200,
        height: 630,
        alt: "AniWaveX Anime Streaming Platform",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AniWaveX — Premium Anime Streaming & Discovery",
    description: SITE_CONFIG.description,
    images: [SITE_CONFIG.ogImage],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col pb-20 md:pb-0">
        <JsonLd schema={createWebSiteSchema()} />
        <JsonLd schema={createOrganizationSchema()} />
        <NavigationProgress />
        <ThemeProvider>
          <AuthProvider>
            <NotificationManager />
            <SpatialNavigationProvider />
            {children}
            <CommandPalette />
            <MobileBottomNav />
          </AuthProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
