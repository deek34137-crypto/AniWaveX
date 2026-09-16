"use client";

import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/video.css';
import { MediaPlayer, MediaProvider, Track, useMediaState, type MediaPlayerInstance } from '@vidstack/react';
import { defaultLayoutIcons, DefaultVideoLayout } from '@vidstack/react/player/layouts/default';
import { useRef, useEffect, useState, useCallback } from "react";
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { RotateCw } from "lucide-react";

interface NativePlayerProps {
  url: string;
  title: string;
  poster?: string;
  subtitles?: any[];
  initialTime?: number;
  autoPlay?: boolean;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onError?: (error: any) => void;
  playerRef?: React.RefObject<MediaPlayerInstance | null>;
}

function isValidVttSubtitle(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  // All subtitles (including .ass, .ssa, .srt, .vtt) proxied through /api/proxy or valid WebVTT tracks are supported
  return url.startsWith('/api/proxy') || url.startsWith('http://') || url.startsWith('https://');
}

export default function NativePlayer({ 
  url, 
  title, 
  poster, 
  subtitles, 
  initialTime = 0,
  autoPlay = true,
  onTimeUpdate,
  onEnded,
  onError,
  playerRef: externalRef
}: NativePlayerProps) {
  const internalRef = useRef<MediaPlayerInstance>(null);
  const player = externalRef || internalRef;
  const containerRef = useRef<HTMLDivElement>(null);

  const isFullscreen = useMediaState('fullscreen', player);
  const [isPortrait, setIsPortrait] = useState(false);
  const [forceCssLandscape, setForceCssLandscape] = useState(false);

  // 1. Multi-tier Landscape Lock
  const lockLandscape = useCallback(async () => {
    // Tier A: Official Capacitor ScreenOrientation plugin
    try {
      await ScreenOrientation.lock({ orientation: 'landscape' });
      return;
    } catch {
      try {
        await ScreenOrientation.lock({ orientation: 'landscape-primary' });
        return;
      } catch {}
    }

    // Tier B: Capacitor dynamic plugin bridge on window
    try {
      const capPlugin = (window as any)?.Capacitor?.Plugins?.ScreenOrientation;
      if (capPlugin?.lock) {
        await capPlugin.lock({ orientation: 'landscape' });
        return;
      }
    } catch {
      try {
        const capPlugin = (window as any)?.Capacitor?.Plugins?.ScreenOrientation;
        if (capPlugin?.lock) {
          await capPlugin.lock({ orientation: 'landscape-primary' });
          return;
        }
      } catch {}
    }

    // Tier C: Capacitor nativePromise bridge fallback
    try {
      const cap = (window as any)?.Capacitor;
      if (cap?.nativePromise) {
        await cap.nativePromise('ScreenOrientation', 'lock', { orientation: 'landscape' });
        return;
      }
    } catch {}

    // Tier D: Standard W3C Screen Orientation API
    try {
      const orientation = window.screen?.orientation;
      if (orientation && typeof (orientation as any).lock === 'function') {
        await (orientation as any).lock('landscape').catch(async () => {
          await (orientation as any).lock('landscape-primary').catch(() => {});
        });
        return;
      }
    } catch {}

    // Tier E: Vendor-prefixed legacy Screen Orientation APIs
    try {
      const s = window.screen as any;
      if (s?.lockOrientation) {
        s.lockOrientation('landscape') || s.lockOrientation('landscape-primary');
        return;
      }
      if (s?.mozLockOrientation) {
        s.mozLockOrientation('landscape') || s.mozLockOrientation('landscape-primary');
        return;
      }
      if (s?.msLockOrientation) {
        s.msLockOrientation('landscape') || s.msLockOrientation('landscape-primary');
        return;
      }
    } catch {}
  }, []);

  // 2. Multi-tier Unlock Orientation
  const unlockOrientation = useCallback(async () => {
    try {
      await ScreenOrientation.unlock();
    } catch {}

    try {
      const capPlugin = (window as any)?.Capacitor?.Plugins?.ScreenOrientation;
      if (capPlugin?.unlock) {
        await capPlugin.unlock();
      }
    } catch {}

    try {
      const cap = (window as any)?.Capacitor;
      if (cap?.nativePromise) {
        await cap.nativePromise('ScreenOrientation', 'unlock', {});
      }
    } catch {}

    try {
      if (window.screen?.orientation && typeof window.screen.orientation.unlock === 'function') {
        window.screen.orientation.unlock();
      }
    } catch {}

    try {
      const s = window.screen as any;
      if (s?.unlockOrientation) s.unlockOrientation();
      if (s?.mozUnlockOrientation) s.mozUnlockOrientation();
      if (s?.msUnlockOrientation) s.msUnlockOrientation();
    } catch {}
  }, []);

  // Track window orientation (portrait vs landscape)
  useEffect(() => {
    const checkOrientation = () => {
      const portrait = typeof window !== 'undefined' && window.innerHeight > window.innerWidth;
      setIsPortrait(portrait);
      if (!portrait) {
        setForceCssLandscape(false);
      }
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    if (window.screen?.orientation) {
      window.screen.orientation.addEventListener('change', checkOrientation);
    }

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
      if (window.screen?.orientation) {
        window.screen.orientation.removeEventListener('change', checkOrientation);
      }
    };
  }, []);

  // Synchronize orientation lock with player fullscreen state
  useEffect(() => {
    if (isFullscreen) {
      lockLandscape();
    } else {
      unlockOrientation();
      setForceCssLandscape(false);
    }
  }, [isFullscreen, lockLandscape, unlockOrientation]);

  // DOM event fallback for native fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = Boolean(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement ||
        player.current?.state.fullscreen
      );

      if (isFs) {
        lockLandscape();
      } else {
        unlockOrientation();
        setForceCssLandscape(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      unlockOrientation();
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, [lockLandscape, unlockOrientation, player]);

  // Capture user tap on fullscreen button to invoke lockLandscape within trusted user-gesture context
  const handleContainerClick = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const target = e.target as HTMLElement | null;
    const isFsBtn = target?.closest(
      'button[aria-label*="ullscreen"], [data-part="fullscreen-button"], .vds-fullscreen-button'
    );
    if (isFsBtn) {
      lockLandscape();
    }
  }, [lockLandscape]);

  // Filter and sanitize subtitles to ensure WebVTT compatibility
  const validTracks = subtitles
    ?.filter((sub: any) => {
      const subUrl = sub?.url || sub?.file || sub?.src;
      return subUrl && isValidVttSubtitle(subUrl);
    }) || [];

  // Find index of preferred English track for default selection
  const defaultTrackIndex = validTracks.findIndex((sub: any) => {
    const subLabel = (sub.label || sub.language || '').toLowerCase();
    const subLang = (sub.lang || sub.srclang || sub.language || '').toLowerCase();
    return sub.default || subLabel.includes('english') || subLang === 'en';
  });

  return (
    <div 
      ref={containerRef}
      onClickCapture={handleContainerClick}
      onTouchStartCapture={handleContainerClick}
      className={`relative w-full h-full ${
        forceCssLandscape 
          ? "!fixed !inset-0 !top-1/2 !left-1/2 !-translate-x-1/2 !-translate-y-1/2 !rotate-90 !w-[100vh] !h-[100vw] !z-[999999] !max-w-none !max-h-none !overflow-hidden !bg-black" 
          : ""
      }`}
    >
      {/* Floating Rotate button when fullscreen is active on a portrait device */}
      {isFullscreen && isPortrait && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            lockLandscape();
            setForceCssLandscape(prev => !prev);
          }}
          className="fixed top-4 right-14 z-[999999] px-3 py-1.5 rounded-lg bg-black/80 hover:bg-slate-800 backdrop-blur text-white text-xs font-semibold border border-white/20 flex items-center gap-1.5 shadow-xl active:scale-95 transition-all cursor-pointer pointer-events-auto"
          title="Rotate Orientation"
        >
          <RotateCw className="w-3.5 h-3.5 text-blue-400" />
          <span>{forceCssLandscape ? "Portrait View" : "Rotate Landscape"}</span>
        </button>
      )}

      <MediaPlayer 
        ref={player}
        title={title} 
        src={url} 
        poster={poster} 
        viewType="video" 
        streamType="on-demand" 
        fullscreenOrientation="landscape"
        crossOrigin
        playsInline
        currentTime={initialTime}
        autoPlay={autoPlay}
        onFullscreenChange={(isFs) => {
          if (isFs) {
            lockLandscape();
          } else {
            unlockOrientation();
            setForceCssLandscape(false);
          }
        }}
        onTimeUpdate={(detail) => {
          if (onTimeUpdate && typeof detail.currentTime === 'number') {
            const dur = player.current?.duration;
            onTimeUpdate(detail.currentTime, typeof dur === 'number' && !isNaN(dur) && dur > 0 ? dur : 0);
          }
        }}
        onEnd={onEnded}
        onError={onError}
      >
        <MediaProvider>
          {validTracks.map((sub: any, idx: number) => {
            const subUrl = sub.url || sub.file || sub.src;
            const subLabel = sub.label || sub.language || `Subtitle ${idx + 1}`;
            const subLang = sub.lang || sub.srclang || sub.language || 'en';
            const isDefault = defaultTrackIndex === -1 ? idx === 0 : idx === defaultTrackIndex;
            
            return (
              <Track
                key={`${subUrl}-${idx}`}
                src={subUrl}
                kind="subtitles"
                label={subLabel}
                lang={subLang}
                default={isDefault}
              />
            );
          })}
        </MediaProvider>
        <DefaultVideoLayout icons={defaultLayoutIcons} />
      </MediaPlayer>
    </div>
  );
}
