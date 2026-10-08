"use client";

import { useState, useRef, useEffect } from "react";
import { CalendarPlus, Calendar, Download, Check } from "lucide-react";
import { createGoogleCalendarUrl, downloadIcsCalendar } from "@/lib/calendar";

interface CalendarReminderButtonProps {
  title: string;
  episodeNumber?: number | string;
  airingAt?: number;
  slug: string;
}

export default function CalendarReminderButton({
  title,
  episodeNumber,
  airingAt,
  slug,
}: CalendarReminderButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  if (!airingAt) return null;

  const eventTitle = `${title} - Episode ${episodeNumber || ""}`.trim();
  const eventDesc = `Broadcast of ${eventTitle}. Watch episode when released on AniWaveX: ${
    typeof window !== "undefined" ? window.location.origin : ""
  }/anime/${slug}`;

  const handleGoogleCalendar = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = createGoogleCalendarUrl({
      title: eventTitle,
      description: eventDesc,
      airingAt,
    });
    window.open(url, "_blank", "noopener,noreferrer");
    setIsOpen(false);
  };

  const handleDownloadIcs = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    downloadIcsCalendar({
      title: eventTitle,
      description: eventDesc,
      airingAt,
    });
    setDownloaded(true);
    setTimeout(() => {
      setDownloaded(false);
      setIsOpen(false);
    }, 1200);
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  };

  return (
    <div ref={menuRef} className="relative inline-block z-30">
      <button
        type="button"
        onClick={handleToggle}
        aria-label="Add broadcast to calendar"
        className={`p-1.5 rounded-lg border backdrop-blur-md transition-all shadow-md active:scale-90 ${
          isOpen
            ? "bg-blue-600 border-blue-400 text-white"
            : "bg-black/70 hover:bg-slate-800 border-white/15 text-slate-300 hover:text-white"
        }`}
        title="Add to Calendar / Remind Me"
      >
        <CalendarPlus className="w-3.5 h-3.5" />
      </button>

      {isOpen && (
        <div
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="absolute right-0 bottom-full mb-1.5 w-44 bg-slate-900/98 backdrop-blur-xl border border-white/15 rounded-xl shadow-2xl p-1 z-50 animate-in fade-in zoom-in-95"
        >
          <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-white/10 mb-1">
            Add to Calendar
          </div>

          <button
            type="button"
            onClick={handleGoogleCalendar}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-left font-semibold text-slate-200 hover:text-white hover:bg-blue-600/20 rounded-lg transition-colors cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
            <span>Google Calendar</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadIcs}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-left font-semibold text-slate-200 hover:text-white hover:bg-blue-600/20 rounded-lg transition-colors cursor-pointer"
          >
            {downloaded ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">Saved .ICS!</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>Apple / Outlook (.ics)</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
