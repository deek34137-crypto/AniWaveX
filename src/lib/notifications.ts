/**
 * AniWaveX Notification Engine
 * 
 * Clean, user-first notification system.
 * Strictly user-initiated alerts (episode release reminders, watchlist updates, sync alerts).
 * Unsolicited background spam and behavioral quote pushes have been completely removed.
 */

import type { AiringAlertItem } from "@/types/account";
import type { AiringAnimeScheduleItem } from "@/lib/schedule";

// LocalStorage keys
export const STORAGE_KEYS = {
  ENABLED: "aniwavex_notif_enabled",
  PROMPT_SEEN: "aniwavex_notif_prompt_seen",
  LAST_ACTIVITY: "aniwavex_last_app_activity",
  LAST_NOTIF_SENT: "aniwavex_last_notif_sent_time",
  IS_WATCHING: "aniwavex_player_is_watching",
  SCHEDULED_REMINDERS: "aniwavex_scheduled_reminders",
  RECENT_ALERTS: "aniwavex_recent_alerts",
  UNREAD_COUNT: "aniwavex_notif_unread",
  DELIVERED_NOTIFS: "aniwavex_delivered_notifs",
  EPISODES_PREF: "aniwavex_notif_episodes",
};

// Safe storage utilities
export function getSafeLocalStorage(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function setSafeLocalStorage(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch {}
}

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
      setSafeLocalStorage(STORAGE_KEYS.ENABLED, granted ? "true" : "false");
      return granted;
    } catch {
      return false;
    }
  }

  if (typeof window !== "undefined" && "Notification" in window) {
    try {
      const result = await Notification.requestPermission();
      const granted = result === "granted";
      setSafeLocalStorage(STORAGE_KEYS.ENABLED, granted ? "true" : "false");
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
  setSafeLocalStorage(STORAGE_KEYS.LAST_ACTIVITY, String(Date.now()));
}

// Cancel all pending native notifications
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
      new Notification(title, { body, icon: "/logo.png" });
      return true;
    } catch {}
  }

  return false;
}

// ── Persistent Alert State & Multi-Tab Synchronization ────────────────────────

export function getRecentAlerts(): AiringAlertItem[] {
  const raw = getSafeLocalStorage(STORAGE_KEYS.RECENT_ALERTS);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (it): it is AiringAlertItem =>
        Boolean(
          it &&
            typeof it === "object" &&
            typeof it.id === "string" &&
            typeof it.slug === "string" &&
            typeof it.title === "string" &&
            typeof it.airingAt === "number"
        )
    );
  } catch {
    return [];
  }
}

export function saveRecentAlerts(alerts: AiringAlertItem[]): void {
  const trimmed = alerts.slice(0, 100);
  setSafeLocalStorage(STORAGE_KEYS.RECENT_ALERTS, JSON.stringify(trimmed));
}

export function getUnreadAlertsCount(): number {
  const raw = getSafeLocalStorage(STORAGE_KEYS.UNREAD_COUNT);
  if (raw !== null) {
    const count = parseInt(raw, 10);
    if (!isNaN(count)) return Math.max(0, count);
  }
  const alerts = getRecentAlerts();
  return alerts.filter((a) => !a.read).length;
}

export function setUnreadAlertsCount(count: number): void {
  setSafeLocalStorage(STORAGE_KEYS.UNREAD_COUNT, String(Math.max(0, count)));
}

export function markAlertsAsRead(): void {
  const alerts = getRecentAlerts();
  const updated = alerts.map((a) => ({ ...a, read: true }));
  saveRecentAlerts(updated);
  setUnreadAlertsCount(0);
  dispatchNotificationStateChange(0, updated);
}

export function clearUserNotifications(): void {
  if (typeof window === "undefined") return;
  setSafeLocalStorage(STORAGE_KEYS.RECENT_ALERTS, "[]");
  setSafeLocalStorage(STORAGE_KEYS.UNREAD_COUNT, "0");
  setSafeLocalStorage(STORAGE_KEYS.DELIVERED_NOTIFS, "[]");
  dispatchNotificationStateChange(0, []);
}

export function wasNotificationDelivered(notifId: string): boolean {
  const raw = getSafeLocalStorage(STORAGE_KEYS.DELIVERED_NOTIFS);
  if (!raw) return false;
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) && list.includes(notifId);
  } catch {
    return false;
  }
}

export function markNotificationDelivered(notifId: string): void {
  const raw = getSafeLocalStorage(STORAGE_KEYS.DELIVERED_NOTIFS);
  let list: string[] = [];
  try {
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        list = parsed.filter((it): it is string => typeof it === "string");
      }
    }
  } catch {}

  if (!list.includes(notifId)) {
    list.unshift(notifId);
    if (list.length > 200) list = list.slice(0, 200);
    setSafeLocalStorage(STORAGE_KEYS.DELIVERED_NOTIFS, JSON.stringify(list));
  }
}

export function dispatchNotificationStateChange(unread: number, alerts?: AiringAlertItem[]): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("aniwavex_notif_state_change", {
      detail: {
        unread,
        alerts: alerts ?? getRecentAlerts(),
      },
    })
  );
}

// ── Watchlist Schedule Matching ──────────────────────────────────────────────

export function normalizeTitleOrSlug(val?: string | null): string {
  if (!val) return "";
  return val
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

export interface WatchlistAnimeMatchTarget {
  slug: string;
  title?: string;
  anilistId?: number | string;
  animeId?: number | string;
}

/**
 * Cross-references a user's watchlist with the airing schedule.
 * Matches by exact AniList ID, exact slug, normalized slug, and normalized titles.
 * Validates timestamp units (Unix seconds) and finds episodes within the alert window.
 */
export function getUpcomingAiringForWatchlist(
  watchlist: Array<string | WatchlistAnimeMatchTarget>,
  airingSchedule: AiringAnimeScheduleItem[],
  options?: {
    withinSeconds?: number; // default 1800 (30 mins)
    allowAiredGracePeriodSeconds?: number; // default 300 (5 mins)
    nowSeconds?: number;
  }
): AiringAnimeScheduleItem[] {
  if (!watchlist || watchlist.length === 0 || !airingSchedule || airingSchedule.length === 0) {
    return [];
  }

  const withinSeconds = options?.withinSeconds ?? 1800; // 30 minutes
  const gracePeriodSeconds = options?.allowAiredGracePeriodSeconds ?? 300; // 5 minutes
  const nowSeconds = options?.nowSeconds ?? Math.floor(Date.now() / 1000);

  // Build fast lookup collections
  const exactSlugs = new Set<string>();
  const normalizedSlugs = new Set<string>();
  const normalizedTitles = new Set<string>();
  const matchedIds = new Set<string>();

  // Ingest input watchlist
  for (const item of watchlist) {
    if (typeof item === "string") {
      if (!item) continue;
      exactSlugs.add(item);
      normalizedSlugs.add(normalizeTitleOrSlug(item));
    } else if (item && typeof item === "object") {
      if (item.slug) {
        exactSlugs.add(item.slug);
        normalizedSlugs.add(normalizeTitleOrSlug(item.slug));
      }
      if (item.title) {
        normalizedTitles.add(normalizeTitleOrSlug(item.title));
      }
      if (item.anilistId) {
        matchedIds.add(String(item.anilistId));
      }
      if (item.animeId) {
        matchedIds.add(String(item.animeId));
      }
    }
  }

  // Also check local watchlist cache for enriched title/anilistId data if in browser
  if (typeof window !== "undefined") {
    try {
      const localWatchlistRaw = getSafeLocalStorage("aniwavex_watchlist");
      if (localWatchlistRaw) {
        const localItems = JSON.parse(localWatchlistRaw);
        if (Array.isArray(localItems)) {
          for (const it of localItems) {
            if (it?.anime_slug && exactSlugs.has(it.anime_slug)) {
              if (it.anime_title) normalizedTitles.add(normalizeTitleOrSlug(it.anime_title));
              if (it.anilist_id) matchedIds.add(String(it.anilist_id));
              if (it.id && !isNaN(Number(it.id))) matchedIds.add(String(it.id));
            }
          }
        }
      }
    } catch {}
  }

  const results: AiringAnimeScheduleItem[] = [];
  const seenEpisodeKeys = new Set<string>();

  for (const item of airingSchedule) {
    if (!item || !item.airingAt || typeof item.nextEpisodeNumber !== "number" || isNaN(item.nextEpisodeNumber)) continue;

    // Unix seconds validation
    const diffSec = item.airingAt - nowSeconds;

    // Must be within window: <= 30 mins before, and >= -5 mins after
    if (diffSec > withinSeconds) continue;
    if (diffSec < -gracePeriodSeconds) continue;

    // Check matches
    let isMatch = false;

    // 1. Direct AniList ID or animeId match
    if (item.anilistId && matchedIds.has(String(item.anilistId))) {
      isMatch = true;
    } else if (item.id && matchedIds.has(String(item.id))) {
      isMatch = true;
    }

    // 2. Exact slug match
    if (!isMatch && item.slug && exactSlugs.has(item.slug)) {
      isMatch = true;
    }

    // 3. Normalized slug match
    if (!isMatch && item.slug && normalizedSlugs.has(normalizeTitleOrSlug(item.slug))) {
      isMatch = true;
    }

    // 4. Normalized title match
    if (!isMatch) {
      const titles = [item.title, item.romajiTitle, item.nativeTitle].filter(Boolean);
      for (const t of titles) {
        const norm = normalizeTitleOrSlug(t);
        if (norm && (normalizedTitles.has(norm) || normalizedSlugs.has(norm))) {
          isMatch = true;
          break;
        }
      }
    }

    if (isMatch) {
      const key = `${item.anilistId || item.id || item.slug}_ep_${item.nextEpisodeNumber}`;
      if (!seenEpisodeKeys.has(key)) {
        seenEpisodeKeys.add(key);
        results.push(item);
      }
    }
  }

  return results;
}

// ── Browser Notification Delivery ───────────────────────────────────────────

export async function sendAiringBrowserNotification(alert: AiringAlertItem): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const hasPerm = await checkNotificationPermission();
  if (!hasPerm) return false;

  const title = `${alert.title} - Episode ${alert.episodeNumber} Airing! 🍿`;
  const body = `Episode ${alert.episodeNumber} is now broadcasting in Japan. Tap to open on AniWaveX.`;
  const targetUrl = `/anime/${alert.slug}`;
  const icon = alert.posterImage || "/logo.png";
  const tag = alert.id;

  // 1. Service Worker delivery (enables background notificationclick handling)
  if ("serviceWorker" in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await reg.showNotification(title, {
          body,
          icon,
          badge: "/logo.png",
          tag,
          data: { url: targetUrl },
        });
        return true;
      }
    } catch {}
  }

  // 2. Direct Window Notification fallback
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      const n = new Notification(title, {
        body,
        icon,
        tag,
        data: { url: targetUrl },
      });
      n.onclick = (e) => {
        e.preventDefault();
        window.focus();
        window.location.href = targetUrl;
      };
      return true;
    } catch {}
  }

  return false;
}

// ── Manual Episode Reminder Scheduling ────────────────────────────────────────

export interface ScheduledReminderRecord {
  id: string;
  animeTitle: string;
  episodeNumber: number;
  airTimeMs: number;
  slug: string;
  animeId?: string | number;
  createdAt: number;
}

export function getScheduledReminders(): ScheduledReminderRecord[] {
  const raw = getSafeLocalStorage(STORAGE_KEYS.SCHEDULED_REMINDERS);
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list.filter(
      (r): r is ScheduledReminderRecord =>
        Boolean(
          r &&
            typeof r === "object" &&
            typeof r.id === "string" &&
            typeof r.airTimeMs === "number" &&
            !isNaN(r.airTimeMs)
        )
    );
  } catch {
    return [];
  }
}

export function saveScheduledReminders(reminders: ScheduledReminderRecord[]): void {
  setSafeLocalStorage(STORAGE_KEYS.SCHEDULED_REMINDERS, JSON.stringify(reminders));
}

/**
 * Schedule a user-requested upcoming episode release alert.
 * Works across native Capacitor and modern Web Browsers.
 */
export async function scheduleEpisodeReminder(
  animeTitle: string,
  episodeNumber: number,
  airDate: Date,
  slug?: string,
  animeId?: string | number
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
  const resolvedSlug = slug || animeTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  // 1. Capacitor native app
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
      console.warn("[AniWaveX] Failed to schedule native reminder:", err);
      return false;
    }
  }

  // 2. Web browser: Persist reminder in localStorage
  const recordId = `reminder_${animeId || resolvedSlug}_ep_${episodeNumber}`;
  const now = Date.now();
  const airTimeMs = airDate.getTime();

  if (airTimeMs < now - 300000) {
    return false; // already aired
  }

  const existing = getScheduledReminders().filter((r) => r.id !== recordId && r.airTimeMs > now);
  existing.push({
    id: recordId,
    animeTitle,
    episodeNumber,
    airTimeMs,
    slug: resolvedSlug,
    animeId,
    createdAt: now,
  });
  saveScheduledReminders(existing);

  // If airing within current session (< 12 hours), schedule timeout in-memory as well
  const msUntilAir = airTimeMs - now;
  if (msUntilAir > 0 && msUntilAir < 12 * 3600 * 1000) {
    setTimeout(async () => {
      const alertItem: AiringAlertItem = {
        id: recordId,
        animeId: animeId || resolvedSlug,
        slug: resolvedSlug,
        title: animeTitle,
        posterImage: "/logo.png",
        episodeNumber,
        airingAt: Math.floor(airTimeMs / 1000),
        createdAt: Date.now(),
        read: false,
        browserNotificationDelivered: false,
      };
      await sendAiringBrowserNotification(alertItem);
    }, msUntilAir);
  }

  return true;
}

export type ReminderScheduleStatus =
  | "scheduled"
  | "granted"
  | "denied"
  | "unsupported"
  | "already_aired"
  | "error";

export async function requestAndScheduleReminder(params: {
  animeTitle: string;
  episodeNumber: number;
  airDate: Date;
  slug?: string;
  animeId?: string | number;
}): Promise<{ success: boolean; status: ReminderScheduleStatus }> {
  if (typeof window === "undefined") {
    return { success: false, status: "unsupported" };
  }

  if (params.airDate.getTime() < Date.now() - 300000) {
    return { success: false, status: "already_aired" };
  }

  const hasPerm = await checkNotificationPermission();
  if (!hasPerm) {
    const granted = await requestNotificationPermission();
    if (!granted) {
      return { success: false, status: "denied" };
    }
  }

  try {
    const ok = await scheduleEpisodeReminder(
      params.animeTitle,
      params.episodeNumber,
      params.airDate,
      params.slug,
      params.animeId
    );
    return { success: ok, status: ok ? "scheduled" : "error" };
  } catch {
    return { success: false, status: "error" };
  }
}

/**
 * Deprecated unsolicited behavioral notification scheduler.
 * Retained as a safe no-op to prevent broken imports.
 */
export async function scheduleBehaviorNotification(): Promise<void> {
  return;
}
