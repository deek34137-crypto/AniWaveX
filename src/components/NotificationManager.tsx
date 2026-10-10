"use client";

import { useEffect } from "react";
import {
  recordUserActivity,
  cancelPendingNotifications,
} from "@/lib/notifications";

export default function NotificationManager() {
  useEffect(() => {
    // 1. Record activity on mount
    recordUserActivity();

    // 2. While user is in the app, cancel any pending notifications so they are never disturbed
    cancelPendingNotifications();

    // 3. User interaction listener to update activity timestamp
    const handleUserInteraction = () => {
      recordUserActivity();
    };

    window.addEventListener("click", handleUserInteraction, { passive: true });
    window.addEventListener("touchstart", handleUserInteraction, { passive: true });
    window.addEventListener("keydown", handleUserInteraction, { passive: true });

    // 4. Tab visibility change or backgrounding
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        recordUserActivity();
        cancelPendingNotifications();
      } else {
        recordUserActivity();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // 5. Capacitor native App lifecycle if present
    let appListener: any = null;
    if (typeof window !== "undefined" && (window as any).Capacitor?.Plugins?.App) {
      try {
        const CapApp = (window as any).Capacitor.Plugins.App;
        CapApp.addListener("appStateChange", ({ isActive }: { isActive: boolean }) => {
          if (isActive) {
            recordUserActivity();
            cancelPendingNotifications();
          } else {
            recordUserActivity();
          }
        }).then((handle: any) => {
          appListener = handle;
        });
      } catch {}
    }

    return () => {
      window.removeEventListener("click", handleUserInteraction);
      window.removeEventListener("touchstart", handleUserInteraction);
      window.removeEventListener("keydown", handleUserInteraction);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (appListener && typeof appListener.remove === "function") {
        appListener.remove();
      }
    };
  }, []);

  return null;
}
