"use client";

import { useState, useEffect } from "react";
import { Activity } from "lucide-react";
import AnalyticsModal from "./AnalyticsModal";
import { useAuth } from "@/providers/AuthProvider";
import { isAdminUser } from "@/lib/admin";

export default function LivePulseBadge() {
  const { user } = useAuth();
  const isAdmin = isAdminUser(user);
  const [concurrentCount, setConcurrentCount] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    let isMounted = true;

    const fetchCount = async () => {
      try {
        const res = await fetch("/api/heartbeat", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (isMounted && typeof data.concurrentUsers === "number") {
            setConcurrentCount(data.concurrentUsers);
          }
        }
      } catch {}
    };

    fetchCount();
    const interval = setInterval(fetchCount, 15000); // 15-second refresh

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isAdmin]);

  if (!isAdmin) return null;

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all shadow-sm hover:scale-105 active:scale-95 select-none"
        title="Click to view live traffic stats"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span>{concurrentCount !== null ? `${concurrentCount} Online` : "Live"}</span>
      </button>

      <AnalyticsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
