"use client";

import { useState, useEffect } from "react";
import { Bell, X, Sparkles } from "lucide-react";
import {
  checkNotificationPermission,
  requestNotificationPermission,
  STORAGE_KEYS
} from "@/lib/notifications";

export default function NotificationPermissionPrompt() {
  const [isVisible, setIsVisible] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    // Check if prompt is eligible to show
    const checkEligibility = async () => {
      if (typeof window === "undefined") return;

      const hasPermission = await checkNotificationPermission();
      if (hasPermission) return; // Already granted

      const disabled = localStorage.getItem(STORAGE_KEYS.ENABLED) === "false";
      if (disabled) return; // User explicitly disabled

      const lastPrompt = Number(localStorage.getItem(STORAGE_KEYS.PROMPT_SEEN) || 0);
      const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
      if (lastPrompt > 0 && Date.now() - lastPrompt < SEVEN_DAYS_MS) {
        return; // Don't annoy user if recently seen
      }

      // Delay prompt slightly (4 seconds) so user gets oriented first
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 4000);

      return () => clearTimeout(timer);
    };

    checkEligibility();
  }, []);

  const handleAccept = async () => {
    setIsRequesting(true);
    try {
      const granted = await requestNotificationPermission();
      localStorage.setItem(STORAGE_KEYS.PROMPT_SEEN, String(Date.now()));
      setIsVisible(false);
    } catch {
      setIsVisible(false);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEYS.PROMPT_SEEN, String(Date.now()));
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-6 left-4 right-4 max-w-md mx-auto z-[999] animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 p-4 sm:p-5 rounded-2xl shadow-2xl ring-1 ring-blue-500/20 text-white">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0 text-blue-400">
            <Bell className="w-5 h-5 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0 pr-2">
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-sm text-white">Never miss an episode</h3>
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Get subtle reminders when your next episode drops or to resume where you left off. Max 1 gentle reminder a day, and <span className="text-blue-400 font-semibold">never while you're watching</span>.
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors shrink-0"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/5">
          <button
            onClick={handleAccept}
            disabled={isRequesting}
            className="flex-1 py-2 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition-all text-center"
          >
            {isRequesting ? "Enabling..." : "Turn On Notifications"}
          </button>
          <button
            onClick={handleDismiss}
            className="py-2 px-3 text-xs text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors font-medium"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}
