"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function ProgressIndicator() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const finishTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Clear timers helper
  const clearAllTimers = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
  };

  const startProgress = () => {
    clearAllTimers();
    setLoading(true);
    setProgress(25);

    // Increment progress in simulated intervals
    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 85) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 85;
        }
        return prev + Math.floor(Math.random() * 15) + 5;
      });
    }, 200);
  };

  const finishProgress = () => {
    clearAllTimers();
    setProgress(100);

    finishTimerRef.current = setTimeout(() => {
      setLoading(false);
      setProgress(0);
    }, 250);
  };

  // Route change completion
  useEffect(() => {
    if (loading) {
      finishProgress();
    }
  }, [pathname, searchParams]);

  // Click interception for internal navigation links & popstate (back/forward)
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      // Find closest anchor tag
      const anchor = (e.target as HTMLElement)?.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      // Ignore external links, mailto, tel, target="_blank", or hash jumps on same page
      if (
        href.startsWith("http") ||
        href.startsWith("//") ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        anchor.target === "_blank" ||
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey ||
        e.altKey ||
        e.defaultPrevented
      ) {
        return;
      }

      // Check if navigating to the same URL
      const currentUrl = window.location.pathname + window.location.search;
      if (href === currentUrl || href === window.location.pathname) {
        return;
      }

      // Start the progress indicator immediately on click for 0ms visual feedback
      startProgress();
    };

    const handlePopState = () => {
      // Browser Back or Forward action triggered
      startProgress();
    };

    document.addEventListener("click", handleDocumentClick, { capture: true });
    window.addEventListener("popstate", handlePopState);

    return () => {
      document.removeEventListener("click", handleDocumentClick, { capture: true });
      window.removeEventListener("popstate", handlePopState);
      clearAllTimers();
    };
  }, []);

  if (!loading && progress === 0) return null;

  return (
    <div
      role="progressbar"
      aria-hidden={!loading}
      aria-label="Page navigation progress"
      className="fixed top-0 left-0 right-0 z-[99999] h-[2.5px] pointer-events-none transition-opacity duration-300"
      style={{
        opacity: loading || progress === 100 ? 1 : 0,
      }}
    >
      <div
        className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 shadow-[0_0_10px_rgba(59,130,246,0.8)] transition-all ease-out"
        style={{
          width: `${progress}%`,
          transitionDuration: progress === 100 ? "150ms" : "250ms",
        }}
      />
    </div>
  );
}

export default function NavigationProgress() {
  return (
    <Suspense fallback={null}>
      <ProgressIndicator />
    </Suspense>
  );
}
