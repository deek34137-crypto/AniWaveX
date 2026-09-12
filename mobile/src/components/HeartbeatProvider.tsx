"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";

const HEARTBEAT_INTERVAL_MS = 45000; // 45 seconds
const VISITOR_ID_KEY = "aniwavex_visitor_id";

function getVisitorId(): string {
  if (typeof window === "undefined") return "guest";
  try {
    let id = localStorage.getItem(VISITOR_ID_KEY);
    if (!id) {
      id = "v_" + (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36));
      localStorage.setItem(VISITOR_ID_KEY, id);
    }
    return id;
  } catch {
    return "guest_" + Math.random().toString(36).substring(2);
  }
}

export default function HeartbeatProvider() {
  const pathname = usePathname();
  const { user } = useAuth();
  const isSendingRef = useRef<boolean>(false);

  const sendPing = useCallback(async (isBeacon = false) => {
    if (typeof window === "undefined" || isSendingRef.current) return;

    const vid = getVisitorId();

    const payload = {
      visitorId: vid,
      userId: user?.id || null,
      currentPath: pathname || "/",
      deviceType: window.innerWidth < 768 ? "mobile" : "desktop",
    };

    if (isBeacon && typeof navigator !== "undefined" && navigator.sendBeacon) {
      try {
        const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
        navigator.sendBeacon("/api/heartbeat", blob);
        return;
      } catch {}
    }

    try {
      isSendingRef.current = true;
      await fetch("/api/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      });
    } catch {
      // Ignore telemetry network errors
    } finally {
      isSendingRef.current = false;
    }
  }, [pathname, user?.id]);

  // 1. Send heartbeat on route change & initial mount
  useEffect(() => {
    sendPing();
  }, [pathname, sendPing]);

  // 2. Periodic ticker (only active when tab is visible)
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        sendPing();
      }
    }, HEARTBEAT_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        sendPing();
      }
    };

    const handleBeforeUnload = () => {
      sendPing(true);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [sendPing]);

  return null;
}
