"use client";

import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/video.css';
import { MediaPlayer, MediaProvider, Track, type MediaPlayerInstance } from '@vidstack/react';
import { defaultLayoutIcons, DefaultVideoLayout } from '@vidstack/react/player/layouts/default';
import { useRef, useEffect } from "react";

interface NativePlayerProps {
  url: string;
  title: string;
  poster?: string;
  subtitles?: any[];
  initialTime?: number;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onError?: (error: any) => void;
  playerRef?: React.RefObject<MediaPlayerInstance | null>;
}

function isValidVttSubtitle(url: string): boolean {
  if (!url || typeof url !== 'string') return false;

  let target = url;
  if (url.startsWith('/api/proxy')) {
    try {
      const parsed = new URL(url, 'http://localhost');
      const paramUrl = parsed.searchParams.get('url');
      if (paramUrl) target = paramUrl;
    } catch {
      target = decodeURIComponent(url);
    }
  }

  const lower = target.toLowerCase().split('?')[0];
  // Filter out .ass and .ssa files which standard HTML5 <track> cannot parse
  if (lower.endsWith('.ass') || lower.endsWith('.ssa')) return false;
  // Accept standard WebVTT tracks
  return lower.endsWith('.vtt') || lower.includes('.vtt') || lower.includes('/vtt/');
}

export default function NativePlayer({ 
  url, 
  title, 
  poster, 
  subtitles, 
  initialTime = 0,
  onTimeUpdate,
  onEnded,
  onError,
  playerRef: externalRef
}: NativePlayerProps) {
  const internalRef = useRef<MediaPlayerInstance>(null);
  const player = externalRef || internalRef;

  // Seek to initialTime once media is ready
  useEffect(() => {
    if (initialTime > 0 && player.current) {
      player.current.currentTime = initialTime;
    }
  }, [initialTime, player]);

  // Automatically lock screen orientation to horizontal (landscape) on mobile when entering fullscreen
  useEffect(() => {
    const handleFullscreenChange = async () => {
      const isFullscreen = Boolean(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );

      if (isFullscreen) {
        try {
          if (screen.orientation && 'lock' in screen.orientation) {
            await (screen.orientation as any).lock('landscape').catch(() => {});
          }
        } catch {
          // Ignore orientation lock errors on unsupported devices
        }
      } else {
        try {
          if (screen.orientation && 'unlock' in screen.orientation) {
            screen.orientation.unlock();
          }
        } catch {
          // Ignore unlock errors
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

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
    <MediaPlayer 
      ref={player}
      title={title} 
      src={url} 
      poster={poster} 
      viewType="video" 
      streamType="on-demand" 
      fullscreenOrientation="landscape"
      crossOrigin
      currentTime={initialTime}
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
  );
}
