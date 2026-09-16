/**
 * AniWaveX Behavior-Based Notification Engine
 * 
 * Rules:
 * 🟢 Actively watching: 0 notifications (NEVER interrupt)
 * 🟢 Used app today: max 1 notification / 24h
 * 🟡 Active recently, not watching: 1/day max
 * 🟠 Inactive 2–3 days: 1/day max
 * 🔴 Inactive 4–7 days: 1 every 2 days
 * ⚫ Inactive 8–14 days: 1–2/week (~every 3.5 days)
 * ⚫ Inactive 15+ days: 1/week max (every 7 days)
 * 
 * Hard global cap: 1 notification per user per 24 hours
 * Cooldown: wait >= 2 hours after last app activity
 * Quiet period: 11 PM – 8 AM (23:00 - 08:00) -> NO notifications
 * Best window: Evening 6:30 PM – 9:30 PM (18:30 - 21:30)
 * 
 * Priority:
 * 1. Unfinished episode / Next episode waiting
 * 2. Watchlist reminder (if inactive >= 2 days)
 * 3. Discovery / General engagement from 100 anime quotes pool
 */

export const NOTIFICATION_MESSAGES = [
  "🍿 Your next anime is waiting 👀",
  "😏 One episode? We both know that's a lie.",
  "📺 Your watchlist called… it misses you 🥲",
  "🌙 Tonight's plan: one more episode. Again. 😂",
  "👀 Found something you might binge…",
  "⚡ Anime time? We thought so.",
  "▶️ Your next binge starts with one tap.",
  "😭 Still thinking about that cliffhanger?",
  "🔥 New episode energy just hit.",
  "📋 Your watchlist has unfinished business 👀",
  "🎭 Plot twist: you should watch anime tonight.",
  "🫣 That 'I'll watch later' anime is still there.",
  "🍿 A little anime break never hurt.",
  "🛋️ Your couch + anime = perfect combo.",
  "😈 We found your excuse to skip one episode.",
  "🥱 Bored? Your watchlist has suggestions.",
  "⏳ Your anime queue is getting impatient.",
  "👀 Just checking… watched anything good lately?",
  "🎧 Tonight deserves a good opening theme.",
  "🚀 One tap away from your next adventure.",
  "⚔️ Your protagonist era starts here.",
  "🍿 Anime plans > other plans.",
  "😭 That cliffhanger isn't going to resolve itself.",
  "⏰ Got 20 minutes? We've got anime.",
  "❤️ Your next favourite character might be waiting.",
  "😂 Time for another 'just one episode.'",
  "🍿 Watchlist ready. Snacks optional. 😌",
  "🚨 A new binge opportunity has appeared.",
  "😎 No plans? Perfect.",
  "🫶 Your anime break is overdue.",
  "👀 Something good is waiting in your watchlist.",
  "😂 That paused episode is still judging you.",
  "😏 Ready when you are, senpai.",
  "🌙 Tonight's recommendation: anime. Obviously.",
  "▶️ Open AniWaveX. Pick something. Press play.",
  "📺 Your watchlist isn't going to watch itself 😭",
  "👀 Feeling like anime? Same.",
  "✨ The perfect episode break might be here.",
  "🚀 Your next binge might be one tap away.",
  "⏱️ Got time for one episode? 👀",
  "😌 Your anime mood has entered the chat.",
  "📺 That series you started? Finish it. 😤",
  "⏳ The next episode is waiting patiently.",
  "👀 Something tells us you need an anime tonight.",
  "🎬 Your evening could use a plot twist.",
  "🍿 Anime cravings? We have a solution.",
  "📱 Your screen time finally has a purpose. 😂",
  "🌙 It's a good night for anime.",
  "🧠 Your watchlist knows what you need.",
  "😂 Just one episode. Famous last words.",
  "🔥 The binge starts whenever you do.",
  "💙 Your next comfort anime might be here.",
  "🥹 Missing your favourite anime?",
  "👋 Your characters are waiting for you.",
  "🍽️ Dinner done? Anime next. 🍿",
  "📚 Study break? Make it an anime break.",
  "🚨 Free time detected. 👀",
  "😂 Your 'nothing to watch' excuse won't work today.",
  "🫡 We saved you from scrolling endlessly.",
  "🎯 Pick an anime. We'll handle the rest.",
  "🌅 Another day, another episode.",
  "📋 Your watchlist deserves some attention.",
  "🌙 Tonight's agenda looks suspiciously anime-shaped.",
  "😂 Your next 'how is it already 2 AM?' starts here.",
  "🎶 The opening song is calling…",
  "👀 You know what would make tonight better?",
  "😎 Yep. Anime.",
  "🤝 Your binge buddy is back.",
  "🌙 Anime before sleep? Dangerous choice. 😂",
  "🗺️ Your next adventure doesn't need a passport.",
  "🎬 Ready for another story?",
  "✨ Something new to watch just sounds right.",
  "👀 Your watchlist has entered its 'watch me' era.",
  "💥 Boredom has officially been challenged.",
  "😭 The episode you've been avoiding is still there.",
  "👁️ Your anime queue is looking at you.",
  "📱 A little screen time, but make it anime.",
  "🌙 Tonight could use a good story.",
  "⭐ Your next favourite anime might surprise you.",
  "🏃 Need a quick escape? Try an episode.",
  "🔥 Your anime phase isn't over yet.",
  "🎉 The weekend looks better with anime.",
  "⏰ Your free hour just found a purpose.",
  "💾 That recommendation you saved? Give it a shot.",
  "🌟 New day. New episode. Same obsession.",
  "📋 Your watchlist has options. 👀",
  "😌 Nothing urgent. Just anime.",
  "💊 Your daily dose of anime is ready.",
  "🛋️ The couch is free. Your anime is too. 🍿",
  "😏 You've got time for one more.",
  "🚀 Your anime journey continues.",
  "🔎 Somewhere out there is your next favourite series.",
  "📱 Less scrolling. More watching. 🍿",
  "😂 Your watchlist is quietly judging you.",
  "🔓 Anime break unlocked!",
  "🚪 The next episode has entered the building.",
  "📞 Your evening called. It wants anime.",
  "👀 What are we watching tonight?",
  "▶️ Press play. Future you will understand. 😂",
  "🌊 AniWaveX is open. The choice is yours. 👀"
];

// LocalStorage keys
export const STORAGE_KEYS = {
  ENABLED: "aniwavex_notif_enabled",
  PROMPT_SEEN: "aniwavex_notif_prompt_seen",
  LAST_ACTIVITY: "aniwavex_last_app_activity",
  LAST_NOTIF_SENT: "aniwavex_last_notif_sent_time",
  IS_WATCHING: "aniwavex_player_is_watching",
  ACTIVE_HOURS: "aniwavex_user_active_hours",
};

// Check if running inside Capacitor Android APK
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

// Request permission from user
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const plugin = getLocalNotificationsPlugin();
  if (plugin) {
    try {
      const res = await plugin.requestPermissions();
      const granted = res.display === "granted";
      if (granted) {
        localStorage.setItem(STORAGE_KEYS.ENABLED, "true");
        scheduleBehaviorNotification();
      } else {
        localStorage.setItem(STORAGE_KEYS.ENABLED, "false");
      }
      return granted;
    } catch {
      return false;
    }
  }

  if (typeof window !== "undefined" && "Notification" in window) {
    try {
      const res = await Notification.requestPermission();
      const granted = res === "granted";
      if (granted) {
        localStorage.setItem(STORAGE_KEYS.ENABLED, "true");
        scheduleBehaviorNotification();
      } else {
        localStorage.setItem(STORAGE_KEYS.ENABLED, "false");
      }
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
      // Actively watching -> cancel any pending notifications immediately
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

// Record user heartbeat activity
export function recordUserActivity(): void {
  if (typeof window === "undefined") return;
  try {
    const now = Date.now();
    localStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, String(now));

    // Learn preferred active hours (sample current hour)
    const currentHour = new Date().getHours();
    const rawHours = localStorage.getItem(STORAGE_KEYS.ACTIVE_HOURS);
    let hours: number[] = rawHours ? JSON.parse(rawHours) : [];
    if (!Array.isArray(hours)) hours = [];
    hours.push(currentHour);
    if (hours.length > 50) hours = hours.slice(-50);
    localStorage.setItem(STORAGE_KEYS.ACTIVE_HOURS, JSON.stringify(hours));
  } catch {}
}

// Cancel all pending notifications (e.g. when user opens the app)
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
 * Behavior-based Notification Decision Engine
 * Chooses ONE strongest notification and the optimal future send time.
 */
export async function scheduleBehaviorNotification(): Promise<void> {
  if (typeof window === "undefined") return;

  // 1. Permission check
  const enabled = localStorage.getItem(STORAGE_KEYS.ENABLED) !== "false";
  const hasPermission = await checkNotificationPermission();
  if (!enabled || !hasPermission) return;

  // 2. Suppress if actively watching or session is currently active
  if (isActivelyWatching()) return;
  if (document.visibilityState === "visible") {
    // User is actively looking at the app right now -> DO NOT NOTIFY NOW
  }

  const now = Date.now();
  const lastActivity = Number(localStorage.getItem(STORAGE_KEYS.LAST_ACTIVITY) || now);
  const lastNotifSent = Number(localStorage.getItem(STORAGE_KEYS.LAST_NOTIF_SENT) || 0);

  // Hard global cap: 1 notification per 24 hours
  const msSinceLastNotif = now - lastNotifSent;
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  if (lastNotifSent > 0 && msSinceLastNotif < ONE_DAY_MS) {
    return; // Already received notification in the last 24h
  }

  // Calculate days of inactivity
  const daysInactive = Math.max(0, (now - lastActivity) / ONE_DAY_MS);

  // Inactivity decay rules:
  // - Used app today (daysInactive < 1): 0–1 push, next day window
  // - Inactive 2–3 days: 1/day max
  // - Inactive 4–7 days: 1 every 2 days
  // - Inactive 8–14 days: 1–2/week (~every 3.5 days)
  // - Inactive 15+ days: 1/week max (every 7 days)
  let requiredIntervalMs = ONE_DAY_MS;
  if (daysInactive >= 15) {
    requiredIntervalMs = 7 * ONE_DAY_MS;
  } else if (daysInactive >= 8) {
    requiredIntervalMs = 3.5 * ONE_DAY_MS;
  } else if (daysInactive >= 4) {
    requiredIntervalMs = 2 * ONE_DAY_MS;
  }

  if (lastNotifSent > 0 && msSinceLastNotif < requiredIntervalMs) {
    return;
  }

  // 3. Determine optimal delivery time
  // Cooldown rule: wait at least 2 hours after last app activity
  const minDeliveryTime = Math.max(now + 2 * 60 * 60 * 1000, lastNotifSent + requiredIntervalMs);

  // Target entertainment evening window: 18:30 – 21:30 (6:30 PM – 9:30 PM)
  const targetDate = new Date(minDeliveryTime);

  // Check learned preferred hour from history
  let targetHour = 19; // Default 7:00 PM
  let targetMinute = Math.floor(Math.random() * 45); // e.g. 19:00 - 19:45
  try {
    const rawHours = localStorage.getItem(STORAGE_KEYS.ACTIVE_HOURS);
    if (rawHours) {
      const hours: number[] = JSON.parse(rawHours);
      if (hours.length > 5) {
        // Find most frequent evening/afternoon active hour
        const counts: Record<number, number> = {};
        for (const h of hours) {
          counts[h] = (counts[h] || 0) + 1;
        }
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        const peakHour = Number(sorted[0][0]);
        // Keep within allowed window (12:00 – 22:00, strictly avoid quiet period 23:00–08:00)
        if (peakHour >= 12 && peakHour <= 21) {
          targetHour = peakHour;
        }
      }
    }
  } catch {}

  // Set the scheduled date
  targetDate.setHours(targetHour, targetMinute, 0, 0);

  // If the calculated time is in the past or within 2h cooldown from now, push to tomorrow
  if (targetDate.getTime() < now + 2 * 60 * 60 * 1000) {
    targetDate.setDate(targetDate.getDate() + 1);
    targetDate.setHours(targetHour, targetMinute, 0, 0);
  }

  // Quiet period enforcement: 11 PM to 8 AM (23:00 - 08:00) forbidden!
  const schedHour = targetDate.getHours();
  if (schedHour >= 23 || schedHour < 8) {
    targetDate.setHours(19, 30, 0, 0); // Re-align to 7:30 PM safe evening window
  }

  // 4. Decision Tree: Choose ONE strongest reason
  let chosenTitle = "AniWaveX 🌊";
  let chosenBody = "";

  // Priority 1: Unfinished episode / Next episode waiting
  try {
    const rawRecent = localStorage.getItem("aniwavex_recent_watches");
    if (rawRecent) {
      const recentList = JSON.parse(rawRecent);
      if (Array.isArray(recentList) && recentList.length > 0) {
        const item = recentList[0];
        const progress = item.progressSeconds || 0;
        const total = item.totalSeconds || 0;
        const percent = total > 0 ? (progress / total) * 100 : 0;
        const animeName = item.animeTitle || "your anime";

        if (percent >= 5 && percent < 85) {
          // Unfinished episode
          const unfinishedQuotes = [
            `That paused episode of ${animeName} is still judging you. 😂`,
            `👀 ${animeName} is still waiting right where you left off…`,
            `😭 Still thinking about that cliffhanger in ${animeName}?`,
            `⏳ Episode ${item.episodeId || ""} of ${animeName} is waiting patiently.`
          ];
          chosenBody = unfinishedQuotes[Math.floor(Math.random() * unfinishedQuotes.length)];
        } else if (percent >= 85) {
          // Finished episode -> next episode trigger
          chosenBody = `🔥 Ready for the next episode of ${animeName}? One tap away.`;
        }
      }
    }
  } catch {}

  // Priority 2: Watchlist reminder (if inactive >= 2 days and has watchlist)
  if (!chosenBody && daysInactive >= 2) {
    try {
      const rawWatchlist = localStorage.getItem("aniwavex_watchlist");
      const hasWatchlist = rawWatchlist && JSON.parse(rawWatchlist).length > 0;
      if (hasWatchlist) {
        const watchlistQuotes = [
          "📋 Your watchlist has unfinished business 👀",
          "📺 Your watchlist called… it misses you 🥲",
          "👀 Something good is waiting in your watchlist.",
          "🥱 Bored? Your watchlist has suggestions.",
          "🧠 Your watchlist knows what you need tonight."
        ];
        chosenBody = watchlistQuotes[Math.floor(Math.random() * watchlistQuotes.length)];
      }
    } catch {}
  }

  // Priority 3: Curated general engagement quote from the 100 quotes pool
  if (!chosenBody) {
    chosenBody = NOTIFICATION_MESSAGES[Math.floor(Math.random() * NOTIFICATION_MESSAGES.length)];
  }

  // 5. Schedule notification via Capacitor LocalNotifications plugin
  const plugin = getLocalNotificationsPlugin();
  if (plugin) {
    try {
      // Clear previous pending notifications first so there is only ever ONE pending
      await cancelPendingNotifications();

      await plugin.schedule({
        notifications: [
          {
            id: 2001,
            title: chosenTitle,
            body: chosenBody,
            schedule: { at: targetDate, allowWhileIdle: true },
            sound: undefined,
            smallIcon: "ic_launcher",
            actionTypeId: "",
            extra: null,
          }
        ]
      });

      localStorage.setItem(STORAGE_KEYS.LAST_NOTIF_SENT, String(targetDate.getTime()));
    } catch (err) {
      console.warn("[AniWaveX] Failed to schedule behavior notification:", err);
    }
  }
}
