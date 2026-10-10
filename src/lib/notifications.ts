/**
 * AniWaveX Notification Engine
 * 
 * Clean, user-first notification system.
 * Strictly user-initiated alerts (episode release reminders, watchlist updates, sync alerts).
 * Unsolicited background spam and behavioral quote pushes have been completely removed.
 */

// LocalStorage keys
export const STORAGE_KEYS = {
  ENABLED: "aniwavex_notif_enabled",
  PROMPT_SEEN: "aniwavex_notif_prompt_seen",
  LAST_ACTIVITY: "aniwavex_last_app_activity",
  LAST_NOTIF_SENT: "aniwavex_last_notif_sent_time",
  IS_WATCHING: "aniwavex_player_is_watching",
  SCHEDULED_REMINDERS: "aniwavex_scheduled_reminders",
};

// Check if running inside Capacitor native Android/iOS app
export function isCapacitorNative(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window as any).Capacitor?.isNativePlatform?.();
}

// Get LocalNotifications plugin instance safely
function getLocalNotificationsPlugin(): any {
  if (typeof window === "undefined") return null;
  return (window as any).Capacitor?.Plugins?.LocalNotifications || null;
}

// Check if notification permission is currently granted
export async function checkNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const plugin = getLocalNotificationsPlugin();
  if (plugin) {
    try {
      const status = await plugin.checkPermissions();
      return status.display === "granted";
    } catch {
      return false;
    }
  }

  if (typeof window !== "undefined" && "Notification" in window) {
    return Notification.permission === "granted";
  }

  return false;
}

// Request notification permission from user with opt-in
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const plugin = getLocalNotificationsPlugin();
  if (plugin) {
    try {
      const res = await plugin.requestPermissions();
      const granted = res.display === "granted";
      localStorage.setItem(STORAGE_KEYS.ENABLED, granted ? "true" : "false");
      return granted;
    } catch {
      return false;
    }
  }

  if (typeof window !== "undefined" && "Notification" in window) {
    try {
      const result = await Notification.requestPermission();
      const granted = result === "granted";
      localStorage.setItem(STORAGE_KEYS.ENABLED, granted ? "true" : "false");
      return granted;
    } catch {
      return false;
    }
  }

  return false;
}

// Mark when user is actively watching / closes player
export function setWatchingState(isWatching: boolean): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEYS.IS_WATCHING, isWatching ? "true" : "false");
    if (isWatching) {
      cancelPendingNotifications();
    }
  } catch {}
}

export function isActivelyWatching(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(STORAGE_KEYS.IS_WATCHING) === "true";
  } catch {
    return false;
  }
}

// Record user interaction timestamp
export function recordUserActivity(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, String(Date.now()));
  } catch {}
}

// Cancel all pending notifications
export async function cancelPendingNotifications(): Promise<void> {
  const plugin = getLocalNotificationsPlugin();
  if (plugin) {
    try {
      const pending = await plugin.getPending();
      if (pending && pending.notifications && pending.notifications.length > 0) {
        await plugin.cancel({ notifications: pending.notifications });
      }
    } catch {}
  }
}

/**
 * Dispatch an immediate user-requested local notification (e.g. sync done, downloaded)
 */
export async function sendLocalNotification(title: string, body: string, id = Date.now()): Promise<boolean> {
  const hasPerm = await checkNotificationPermission();
  if (!hasPerm) return false;

  const plugin = getLocalNotificationsPlugin();
  if (plugin) {
    try {
      await plugin.schedule({
        notifications: [
          {
            id: id % 100000,
            title,
            body,
            schedule: { at: new Date(Date.now() + 1000) },
            smallIcon: "ic_launcher",
          },
        ],
      });
      return true;
    } catch (err) {
      console.warn("[AniWaveX] Failed to schedule native notification:", err);
    }
  } else if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(title, { body, icon: "/favicon.ico" });
      return true;
    } catch {}
  }

  return false;
}

/**
 * Schedule a user-requested upcoming episode release alert
 */
export async function scheduleEpisodeReminder(
  animeTitle: string,
  episodeNumber: number,
  airDate: Date
): Promise<boolean> {
  const hasPerm = await checkNotificationPermission();
  if (!hasPerm) {
    const granted = await requestNotificationPermission();
    if (!granted) return false;
  }

  const notificationId = Math.abs(
    animeTitle.split("").reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) | 0, 0)
  ) % 100000;

  const title = `Episode ${episodeNumber} is Now Airing! 🍿`;
  const body = `${animeTitle} episode ${episodeNumber} is now broadcasting. Tap to watch on AniWaveX.`;

  const plugin = getLocalNotificationsPlugin();
  if (plugin) {
    try {
      await plugin.schedule({
        notifications: [
          {
            id: notificationId,
            title,
            body,
            schedule: { at: airDate, allowWhileIdle: true },
            smallIcon: "ic_launcher",
          },
        ],
      });
      return true;
    } catch (err) {
      console.warn("[AniWaveX] Failed to schedule episode reminder:", err);
      return false;
    }
  }

  return false;
}

/**
 * Deprecated unsolicited behavioral notification scheduler.
 * Retained as a safe no-op to prevent broken imports.
 */
export async function scheduleBehaviorNotification(): Promise<void> {
  // Unsolicited behavioral spam notifications permanently disabled.
  return;
}
