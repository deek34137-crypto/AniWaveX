"use client";

import { useEffect } from "react";

/**
 * SpatialNavigationProvider enables seamless D-pad / arrow-key spatial navigation
 * across all interactive TV elements (buttons, links, inputs).
 * 
 * It automatically detects directional neighbors based on geometric bounding boxes,
 * scrolls active items into view within the TV safe zone, and supports Enter/Back remote keys.
 */
export default function SpatialNavigationProvider() {
  useEffect(() => {
    // Only engage enhanced spatial nav on dedicated TV browsers or explicit TV mode
    const isTVMode = () => {
      if (typeof window === "undefined") return false;
      const isTVDevice = /TV|SmartTV|Android TV|BRAVIA|NetCast|Web0S|Tizen/i.test(navigator.userAgent);
      let isExplicitTV = false;
      try {
        isExplicitTV = localStorage.getItem("aniwavex_tv_mode") === "true";
      } catch {}
      return isTVDevice || isExplicitTV;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid intercepting if user is inside a text input or textarea (unless arrowing out or escape)
      const activeEl = document.activeElement as HTMLElement | null;
      const isInput = activeEl && (
        activeEl.tagName === "INPUT" ||
        activeEl.tagName === "TEXTAREA" ||
        activeEl.isContentEditable
      );

      // Handle Back / Escape key
      if (e.key === "Escape" || e.key === "BrowserBack" || e.key === "Back") {
        const closeBtn = document.querySelector<HTMLElement>('[data-tv-close], [aria-label*="Close" i], button.tv-close');
        if (closeBtn) {
          e.preventDefault();
          closeBtn.click();
          return;
        }
      }

      const key = e.key;
      const isDirectional = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(key);

      if (!isDirectional) return;

      // In text input, only navigate out if at boundary or if empty
      if (isInput) {
        if (key === "ArrowUp" || key === "ArrowDown") {
          // Allow vertical navigation out of search input
          activeEl?.blur();
        } else {
          return; // Let user edit text left/right
        }
      }

      if (!isTVMode()) return;

      // Query all focusable interactive candidates
      const selector = `
        a[href]:not([tabindex="-1"]):not([disabled]),
        button:not([tabindex="-1"]):not([disabled]),
        input:not([tabindex="-1"]):not([disabled]),
        select:not([tabindex="-1"]):not([disabled]),
        [tabindex="0"]:not([disabled])
      `;

      const elements = Array.from(document.querySelectorAll<HTMLElement>(selector)).filter((el) => {
        // Must be visible and have size
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).visibility !== "hidden";
      });

      if (elements.length === 0) return;

      // If nothing is focused yet, focus the first sensible hero or nav element
      if (!activeEl || !elements.includes(activeEl)) {
        const primary = elements.find((el) => el.closest('[data-tv-priority="high"]')) || elements[0];
        if (primary) {
          e.preventDefault();
          primary.focus();
          primary.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
        }
        return;
      }

      // Check if current focused element is inside a horizontal scroll rail (e.g., AnimeRow)
      const horizontalRail = activeEl.closest<HTMLElement>(".tv-horizontal-rail, [data-tv-rail]");
      if (horizontalRail && (key === "ArrowLeft" || key === "ArrowRight")) {
        const railItems = Array.from(horizontalRail.querySelectorAll<HTMLElement>(selector)).filter((el) => {
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });

        const currentIndex = railItems.indexOf(activeEl);
        if (currentIndex !== -1) {
          const targetIndex = key === "ArrowRight" ? currentIndex + 1 : currentIndex - 1;
          if (targetIndex >= 0 && targetIndex < railItems.length) {
            e.preventDefault();
            const targetEl = railItems[targetIndex];
            targetEl.focus();
            targetEl.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
            return;
          }
        }
      }

      // Spatial 2D projection search for nearest neighbor in direction
      const currentRect = activeEl.getBoundingClientRect();
      const currentCenter = {
        x: currentRect.left + currentRect.width / 2,
        y: currentRect.top + currentRect.height / 2,
      };

      let bestTarget: HTMLElement | null = null;
      let minDistance = Infinity;

      for (const el of elements) {
        if (el === activeEl) continue;

        const rect = el.getBoundingClientRect();
        const center = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        };

        const dx = center.x - currentCenter.x;
        const dy = center.y - currentCenter.y;

        let isInDirection = false;
        let primaryDelta = 0;
        let secondaryDelta = 0;

        switch (key) {
          case "ArrowRight":
            isInDirection = dx > 8; // At least slightly to the right
            primaryDelta = dx;
            secondaryDelta = Math.abs(dy);
            break;
          case "ArrowLeft":
            isInDirection = dx < -8; // At least slightly to the left
            primaryDelta = -dx;
            secondaryDelta = Math.abs(dy);
            break;
          case "ArrowDown":
            isInDirection = dy > 8; // At least slightly below
            primaryDelta = dy;
            secondaryDelta = Math.abs(dx);
            break;
          case "ArrowUp":
            isInDirection = dy < -8; // At least slightly above
            primaryDelta = -dy;
            secondaryDelta = Math.abs(dx);
            break;
        }

        if (isInDirection) {
          // Weight secondary axis more heavily to prioritize direct column/row alignment
          const weightedDistance = primaryDelta + secondaryDelta * 2.2;
          if (weightedDistance < minDistance) {
            minDistance = weightedDistance;
            bestTarget = el;
          }
        }
      }

      if (bestTarget) {
        e.preventDefault();
        bestTarget.focus();
        bestTarget.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return null;
}
