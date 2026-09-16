"use client";

import { useState, useEffect } from "react";
import AnimeRow from "@/components/AnimeRow";

interface ApkHomeSectionsProps {
  romance: any[];
  comedy: any[];
  isekai: any[];
}

export default function ApkHomeSections({
  romance,
  comedy,
  isekai,
}: ApkHomeSectionsProps) {
  const [isApk, setIsApk] = useState(false);

  useEffect(() => {
    // Detect if running inside Capacitor Android APK, Android WebView, or preview query
    const checkIsApk = () => {
      if (typeof window === "undefined") return false;
      
      const hasCapacitor = !!(window as any).Capacitor?.isNativePlatform?.();
      const isAndroidPlatform = (window as any).Capacitor?.getPlatform?.() === "android";
      const isAndroidWebView = /;\s*wv\b/.test(window.navigator.userAgent);
      const isCustomApp = window.navigator.userAgent.includes("AniWaveX-APK") || window.navigator.userAgent.includes("com.aniwavex.app");
      const isQueryPreview = window.location.search.includes("apk=true");

      return hasCapacitor || isAndroidPlatform || isAndroidWebView || isCustomApp || isQueryPreview;
    };

    setIsApk(checkIsApk());
  }, []);

  if (!isApk) return null;

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {romance && romance.length > 0 && (
        <AnimeRow
          title="Best of Romance"
          items={romance}
          viewAllHref="/catalog?genre=romance&sort=popularity"
        />
      )}
      {comedy && comedy.length > 0 && (
        <AnimeRow
          title="Top Comedy"
          items={comedy}
          viewAllHref="/catalog?genre=comedy&sort=popularity"
        />
      )}
      {isekai && isekai.length > 0 && (
        <AnimeRow
          title="Best Isekai"
          items={isekai}
          viewAllHref="/catalog?genre=isekai&sort=popularity"
        />
      )}
    </div>
  );
}
