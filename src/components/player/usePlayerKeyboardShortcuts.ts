"use client";

import { useEffect, RefObject } from "react";
import type { MediaPlayerInstance } from "@vidstack/react";

interface UsePlayerKeyboardShortcutsOptions {
  mediaPlayerRef?: RefObject<MediaPlayerInstance | null>;
  togglePlay?: () => void;
  toggleMute?: () => void;
  showShortcuts: boolean;
  setShowShortcuts: React.Dispatch<React.SetStateAction<boolean>>;
  isEpisodeDrawerOpen: boolean;
  setIsEpisodeDrawerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  hasNext: boolean;
  hasPrev: boolean;
  handleNext: () => void;
  handlePrev: () => void;
  handleNextSource: () => void;
  handlePrevSource: () => void;
  toggleFullscreen: () => void;
  toggleTheaterMode: () => void;
  triggerSeek: (deltaSeconds: number) => void;
}

export function usePlayerKeyboardShortcuts({
  mediaPlayerRef,
  togglePlay,
  toggleMute,
  showShortcuts,
  setShowShortcuts,
  isEpisodeDrawerOpen,
  setIsEpisodeDrawerOpen,
  hasNext,
  hasPrev,
  handleNext,
  handlePrev,
  handleNextSource,
  handlePrevSource,
  toggleFullscreen,
  toggleTheaterMode,
  triggerSeek,
}: UsePlayerKeyboardShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is in an input field or any modal dialog/overlay/palette is active
      const targetEl = e.target as HTMLElement | null;
      const activeTag = (document.activeElement?.tagName || "").toLowerCase();

      if (
        activeTag === "input" ||
        activeTag === "textarea" ||
        activeTag === "select" ||
        targetEl?.isContentEditable ||
        targetEl?.closest('input, textarea, select, [role="dialog"], [aria-modal="true"], .command-palette') ||
        showShortcuts ||
        document.body.classList.contains("overflow-hidden") ||
        document.querySelector('[role="dialog"]') ||
        document.querySelector('[aria-modal="true"]') ||
        document.querySelector('.fixed.z-\\[200\\]') ||
        document.querySelector('.fixed.z-\\[100\\]') ||
        document.querySelector('[data-state="open"]') ||
        document.querySelector("dialog[open]")
      ) {
        return;
      }

      const player = mediaPlayerRef?.current;

      switch (e.key) {
        case " ":
        case "k":
        case "K":
          e.preventDefault();
          if (togglePlay) {
            togglePlay();
          } else if (player) {
            if (player.paused) {
              player.play();
            } else {
              player.pause();
            }
          }
          break;
        case "f":
        case "F":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "t":
        case "T":
          e.preventDefault();
          toggleTheaterMode();
          break;
        case "m":
        case "M":
          e.preventDefault();
          if (toggleMute) {
            toggleMute();
          } else if (player) {
            player.muted = !player.muted;
          }
          break;
        case "ArrowLeft":
          if (player || triggerSeek) {
            e.preventDefault();
            triggerSeek(-10);
          }
          break;
        case "ArrowRight":
          if (player || triggerSeek) {
            e.preventDefault();
            triggerSeek(10);
          }
          break;
        case "s":
          e.preventDefault();
          handleNextSource();
          break;
        case "S":
          e.preventDefault();
          if (e.shiftKey) {
            handlePrevSource();
          } else {
            handleNextSource();
          }
          break;
        case "n":
        case "N":
          if (hasNext) {
            e.preventDefault();
            handleNext();
          }
          break;
        case "p":
        case "P":
          if (hasPrev) {
            e.preventDefault();
            handlePrev();
          }
          break;
        case "e":
        case "E":
          e.preventDefault();
          setIsEpisodeDrawerOpen((prev) => !prev);
          break;
        case "Escape":
          if (isEpisodeDrawerOpen) {
            e.preventDefault();
            setIsEpisodeDrawerOpen(false);
          }
          break;
        case "?":
          setShowShortcuts((prev) => !prev);
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    mediaPlayerRef,
    togglePlay,
    toggleMute,
    hasNext,
    hasPrev,
    handleNext,
    handlePrev,
    handleNextSource,
    handlePrevSource,
    toggleFullscreen,
    toggleTheaterMode,
    triggerSeek,
    showShortcuts,
    setShowShortcuts,
    isEpisodeDrawerOpen,
    setIsEpisodeDrawerOpen,
  ]);
}
