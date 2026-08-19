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
