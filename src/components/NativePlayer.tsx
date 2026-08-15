"use client";

import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/video.css';
import { MediaPlayer, MediaProvider, Track } from '@vidstack/react';
import { defaultLayoutIcons, DefaultVideoLayout } from '@vidstack/react/player/layouts/default';

interface NativePlayerProps {
  url: string;
  title: string;
  poster?: string;
  subtitles?: any[];
}

export default function NativePlayer({ url, title, poster, subtitles }: NativePlayerProps) {
  return (
    <MediaPlayer title={title} src={url} poster={poster} viewType="video" streamType="on-demand" crossOrigin>
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
