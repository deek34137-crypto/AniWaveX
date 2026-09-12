"use client";

import React, { useEffect } from "react";
import { App as CapApp } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";
import { ScreenOrientation } from "@capacitor/screen-orientation";
import { REMOTE_API_BASE_URL } from "@/lib/mobile-config";

export default function MobileAppShell({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // 1. Intercept relative /api/ fetch calls on native mobile to point to remote backend
    if (typeof window !== "undefined") {
      const originalFetch = window.fetch;
      window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
        let url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

        if (typeof url === "string" && url.startsWith("/api/")) {
          url = `${REMOTE_API_BASE_URL}${url}`;
          if (typeof input === "string") {
            input = url;
          } else if (input instanceof URL) {
            input = new URL(url);
          } else {
            input = new Request(url, input);
          }
        }

        return originalFetch.call(this, input, init);
      };
    }

    // 2. Initialize Capacitor plugins safely
    async function initMobileDevice() {
      try {
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: "#0a0a0c" });
        await StatusBar.setOverlaysWebView({ overlay: true });
      } catch {}

      try {
        await CapApp.addListener("backButton", ({ canGoBack }: { canGoBack: boolean }) => {
          const closeBtn = document.querySelector(
            "[data-modal-close='true'], button[aria-label='Close'], button.modal-close"
          ) as HTMLElement | null;

          if (closeBtn) {
            closeBtn.click();
            return;
          }

          if (canGoBack) {
            window.history.back();
          } else {
            CapApp.exitApp();
          }
        });
      } catch {}

      try {
        const handleFullscreenChange = async () => {
          const isFullscreen = !!document.fullscreenElement;
          if (isFullscreen) {
            try {
              await ScreenOrientation.unlock();
            } catch {}
          } else {
            try {
              await ScreenOrientation.lock({ orientation: "portrait" });
            } catch {}
          }
        };

        document.addEventListener("fullscreenchange", handleFullscreenChange);
        document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
      } catch {}
    }

    initMobileDevice();
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white select-none mobile-safe-top">
      {children}
    </div>
  );
}
