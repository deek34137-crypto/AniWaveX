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

  return (
    <MediaPlayer 
      ref={player}
      title={title} 
      src={url} 
      poster={poster} 
      viewType="video" 
      streamType="on-demand" 
      crossOrigin
      currentTime={initialTime}
      onTimeUpdate={(detail) => {
        if (onTimeUpdate && typeof detail.currentTime === 'number') {
          onTimeUpdate(detail.currentTime, player.current?.duration || 0);
        }
      }}
      onEnd={onEnded}
      onError={onError}
    >
      <MediaProvider>
        {subtitles?.map((sub: any, idx: number) => {
          const subUrl = sub.url || sub.file;
          const subLabel = sub.label || sub.language || 'Subtitle';
          const subLang = sub.lang || sub.language || 'en';
          
          if (!subUrl) return null;
          
          return (
            <Track
              key={String(idx)}
              src={subUrl}
              kind="subtitles"
              label={subLabel}
              lang={subLang}
              default={subLabel.toLowerCase().includes('english')}
            />
          );
        })}
      </MediaProvider>
      <DefaultVideoLayout icons={defaultLayoutIcons} />
    </MediaPlayer>
  );
}
