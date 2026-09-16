"use client";

import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/video.css';
import { MediaPlayer, MediaProvider, Track, type MediaPlayerInstance } from '@vidstack/react';
import { defaultLayoutIcons, DefaultVideoLayout } from '@vidstack/react/player/layouts/default';
import { useRef } from "react";

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
      playsInline
      currentTime={initialTime}
      autoPlay={autoPlay}
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
