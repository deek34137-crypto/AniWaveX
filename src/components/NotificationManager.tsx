"use client";

import { useEffect, useRef, useCallback } from "react";
import {
  recordUserActivity,
  cancelPendingNotifications,
  getUpcomingAiringForWatchlist,
  getRecentAlerts,
  saveRecentAlerts,
  getUnreadAlertsCount,
  setUnreadAlertsCount,
  wasNotificationDelivered,
  markNotificationDelivered,
  dispatchNotificationStateChange,
  sendAiringBrowserNotification,
  clearUserNotifications,
  getScheduledReminders,
  saveScheduledReminders,
  getSafeLocalStorage,
  STORAGE_KEYS,
} from "@/lib/notifications";
import { useAuth } from "@/providers/AuthProvider";
import type { AiringAnimeScheduleItem } from "@/lib/schedule";
import type { AiringAlertItem } from "@/types/account";

// In-memory schedule cache across effect reruns
let cachedSchedule: AiringAnimeScheduleItem[] | null = null;
let lastScheduleFetchTime = 0;
const SCHEDULE_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export default function NotificationManager() {
  const { bookmarkedSlugs, user } = useAuth();
  const isCheckingRef = useRef(false);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const checkNotifications = useCallback(async () => {
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;

    try {
      // 1. Respect user preference (saved in localStorage or profile)
      const episodesPref = getSafeLocalStorage(STORAGE_KEYS.EPISODES_PREF);
      if (episodesPref === "false") {
        isCheckingRef.current = false;
        return;
      }

      const now = Date.now();

      // 2. Process manual reminders
      const reminders = getScheduledReminders();
      let remindersModified = false;
      const remainingReminders = [];

      for (const rem of reminders) {
        if (rem.airTimeMs <= now) {
          // Drop stale reminders that expired over 24 hours ago
          if (now - rem.airTimeMs > 24 * 3600 * 1000) {
            remindersModified = true;
            continue;
          }

          if (!wasNotificationDelivered(rem.id)) {
            markNotificationDelivered(rem.id);

            const alertItem: AiringAlertItem = {
              id: rem.id,
              animeId: rem.animeId || rem.slug,
              slug: rem.slug,
              title: rem.animeTitle,
              posterImage: "/logo.png",
              episodeNumber: rem.episodeNumber,
              airingAt: Math.floor(rem.airTimeMs / 1000),
              createdAt: now,
              read: false,
              browserNotificationDelivered: false,
            };

            const delivered = await sendAiringBrowserNotification(alertItem);
            alertItem.browserNotificationDelivered = delivered;

            const currentAlerts = getRecentAlerts();
            if (!currentAlerts.some((a) => a.id === alertItem.id)) {
              const nextAlerts = [alertItem, ...currentAlerts];
              saveRecentAlerts(nextAlerts);
              const nextUnread = getUnreadAlertsCount() + 1;
              setUnreadAlertsCount(nextUnread);
              dispatchNotificationStateChange(nextUnread, nextAlerts);
            }
          }
          remindersModified = true;
        } else {
          remainingReminders.push(rem);
        }
      }

      if (remindersModified) {
        saveScheduledReminders(remainingReminders);
      }

      // 3. Process automated watchlist airing alerts
      if (bookmarkedSlugs.size === 0) {
        isCheckingRef.current = false;
        return;
      }

      // Refresh schedule if cache is stale or missing
      if (!cachedSchedule || now - lastScheduleFetchTime > SCHEDULE_CACHE_TTL_MS) {
        try {
          const res = await fetch("/api/schedule", { cache: "no-store" });
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data?.schedule)) {
              cachedSchedule = data.schedule;
              lastScheduleFetchTime = now;
            }
          }
        } catch {
          // Graceful fallback: continue with existing memory cache if network drops
        }
      }

      if (!cachedSchedule || cachedSchedule.length === 0) {
        isCheckingRef.current = false;
        return;
      }

      // Match upcoming watchlist episodes within 30 minutes
      const upcoming = getUpcomingAiringForWatchlist(
        Array.from(bookmarkedSlugs),
        cachedSchedule,
        { withinSeconds: 1800, allowAiredGracePeriodSeconds: 300 }
      );

      if (upcoming.length === 0) {
        isCheckingRef.current = false;
        return;
      }

      let alertsAdded = false;
      let currentAlerts = getRecentAlerts();
      let unreadCount = getUnreadAlertsCount();

      for (const anime of upcoming) {
        const notifId = `airing_${anime.anilistId || anime.id || anime.slug}_ep_${anime.nextEpisodeNumber}`;

        if (wasNotificationDelivered(notifId) || currentAlerts.some((a) => a.id === notifId)) {
          continue;
        }

        markNotificationDelivered(notifId);

        const newAlert: AiringAlertItem = {
          id: notifId,
          animeId: anime.id,
          anilistId: anime.anilistId,
          slug: anime.slug,
          title: anime.title,
          posterImage: anime.posterImage || "",
          episodeNumber: anime.nextEpisodeNumber,
          airingAt: anime.airingAt,
          airingAtIso: anime.airingAtIso,
          createdAt: Date.now(),
          read: false,
          browserNotificationDelivered: false,
        };

        // Attempt browser notification
        const delivered = await sendAiringBrowserNotification(newAlert);
        newAlert.browserNotificationDelivered = delivered;

        currentAlerts = [newAlert, ...currentAlerts];
        unreadCount += 1;
        alertsAdded = true;
      }

      if (alertsAdded) {
        saveRecentAlerts(currentAlerts);
        setUnreadAlertsCount(unreadCount);
        dispatchNotificationStateChange(unreadCount, currentAlerts);
      }
    } catch (err) {
      console.warn("[AniWaveX] Airing check error non-fatal:", err);
    } finally {
      isCheckingRef.current = false;
    }
  }, [bookmarkedSlugs]);

  // Main lifecycle, activity tracking, and periodic schedule checks
  useEffect(() => {
    // 1. Initial activity tracking & pending cancellation
    recordUserActivity();
    cancelPendingNotifications();

    // 2. Immediate check on mount or when bookmarkedSlugs changes
    checkNotifications();

    // 3. Periodic check every 15 minutes
    if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
    checkIntervalRef.current = setInterval(checkNotifications, 15 * 60 * 1000);

    // 4. User interaction listener for activity update
    const handleUserInteraction = () => {
      recordUserActivity();
    };

    window.addEventListener("click", handleUserInteraction, { passive: true });
    window.addEventListener("touchstart", handleUserInteraction, { passive: true });
    window.addEventListener("keydown", handleUserInteraction, { passive: true });

    // 5. Visibility change handler: check on foreground return
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        recordUserActivity();
        cancelPendingNotifications();
        checkNotifications();
      } else {
        recordUserActivity();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // 6. Settings toggle listener
    const handlePrefChange = () => {
      checkNotifications();
    };
    window.addEventListener("aniwavex_notif_pref_change", handlePrefChange);

    // 7. Capacitor native App lifecycle if present
    let appListener: any = null;
    if (typeof window !== "undefined" && (window as any).Capacitor?.Plugins?.App) {
      try {
        const CapApp = (window as any).Capacitor.Plugins.App;
        CapApp.addListener("appStateChange", ({ isActive }: { isActive: boolean }) => {
          if (isActive) {
            recordUserActivity();
            cancelPendingNotifications();
            checkNotifications();
          } else {
            recordUserActivity();
          }
        }).then((handle: any) => {
          appListener = handle;
        });
      } catch {}
    }

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
      window.removeEventListener("click", handleUserInteraction);
      window.removeEventListener("touchstart", handleUserInteraction);
      window.removeEventListener("keydown", handleUserInteraction);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("aniwavex_notif_pref_change", handlePrefChange);
      if (appListener && typeof appListener.remove === "function") {
        appListener.remove();
      }
    };
  }, [checkNotifications]);

  // Sync state and isolate user notifications on account change or logout
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== (user?.id || null)) {
      clearUserNotifications();
    }
    prevUserIdRef.current = user?.id || null;
    checkNotifications();
  }, [user?.id, checkNotifications]);

  return null;
}
