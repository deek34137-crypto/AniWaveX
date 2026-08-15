"use client";
import { useState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import NativePlayer from "./NativePlayer";

interface StreamSource {
  url: string;
  quality: string;
  isM3U8: boolean;
}

interface InPageVideoPlayerProps {
  episode: any;
  episodes?: any[];
  onEpisodeChange?: (ep: any) => void;
  animeSlug: string;
  animeTitle: string;
  animeType?: string;
  animePosterImage?: string;
  user?: any;
}

import { createClient } from "@/lib/supabase/client";

export default function InPageVideoPlayer({ 
  episode, 
  episodes, 
  animeSlug, 
  animeTitle, 
  animeType,
  animePosterImage, 
  onEpisodeChange,
  user
}: InPageVideoPlayerProps) {
  const [activeTab, setActiveTab] = useState<"sub" | "dub">("sub");
  const [streams, setStreams] = useState<{ sub: StreamSource[], dub: StreamSource[], nativeStream?: any } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [autoplayNext, setAutoplayNext] = useState(false);
  const [selectedServerIndex, setSelectedServerIndex] = useState(0);
  const playerRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Scroll to player when episode changes
  useEffect(() => {
    if (episode && playerRef.current) {
      playerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [episode]);

  // Upsert watch history when episode loads
  useEffect(() => {
    if (episode && user) {
      const upsertHistory = async () => {
        try {
          const { error } = await supabase
            .from('watch_history')
            .upsert({
              user_id: user.id,
              anime_slug: animeSlug,
              anime_title: animeTitle,
              poster_image: animePosterImage,
              last_episode_watched: episode.id,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'user_id, anime_slug'
            });
            
          if (error) console.error("Failed to save watch history", error);
        } catch (err) {
          console.error("Failed to save watch history", err);
        }
      };
      upsertHistory();
    }
  }, [episode, user, animeSlug, animeTitle, animePosterImage, supabase]);

  // Read autoplay preference from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("autoplayNext");
    if (stored) setAutoplayNext(stored === "true");
  }, []);

  const toggleAutoplay = () => {
    const newVal = !autoplayNext;
    setAutoplayNext(newVal);
    localStorage.setItem("autoplayNext", newVal.toString());
  };

  useEffect(() => {
    if (episode) {
      // Fetch stream lazily
      const fetchStream = async () => {
        setIsLoading(true);
        setStreams(null);
        setSelectedServerIndex(0); // Reset server index
        try {
          const typeParam = animeType ? `&type=${encodeURIComponent(animeType)}` : '';
          const audioParam = `&audio=${activeTab}`;
          const baseUrl = process.env.NEXT_PUBLIC_STREAM_API_URL || "http://localhost:3001/stream";
          const res = await fetch(`${baseUrl}?id=${encodeURIComponent(animeSlug)}&ep=${episode.id}&title=${encodeURIComponent(animeTitle)}${typeParam}${audioParam}`);
          const data = await res.json();
          if (!data.error) {
            setStreams(data);
          }
        } catch (error) {
          console.error("Failed to fetch stream", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchStream();
    }
  }, [episode, animeSlug, animeTitle, animeType, activeTab]);

  if (!episode) return null;

  const activeSources: StreamSource[] | undefined = activeTab === "sub" ? streams?.sub : streams?.dub;
  // Ensure selectedServerIndex is within bounds
  const validServerIndex = activeSources ? Math.min(selectedServerIndex, activeSources.length - 1) : 0;
  const currentUrl = activeSources?.[validServerIndex]?.url;

  const currentIndex = episodes ? episodes.findIndex((ep) => ep.id === episode.id) : -1;
  const hasNext = episodes && currentIndex !== -1 && currentIndex < episodes.length - 1;
  const hasPrev = episodes && currentIndex > 0;

  const handleNext = () => {
    if (hasNext && onEpisodeChange && episodes) {
      onEpisodeChange(episodes[currentIndex + 1]);
    }
  };

  const handlePrev = () => {
    if (hasPrev && onEpisodeChange && episodes) {
      onEpisodeChange(episodes[currentIndex - 1]);
    }
  };

  return (
    <div ref={playerRef} className="w-full flex flex-col gap-4 bg-slate-950 py-8 scroll-mt-20">
      <div className="w-full max-w-5xl mx-auto">
        {/* Header / Tabs */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">
              Episode {episode.id}
            </h2>
            <p className="text-slate-400">{episode.title}</p>
          </div>
          
          <div className="flex items-center gap-4 flex-wrap">
            {/* Server Switcher */}
            {activeSources && activeSources.length > 1 && (
              <div className="flex gap-2">
                {activeSources.map((source, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedServerIndex(idx)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${validServerIndex === idx ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'}`}
                  >
                    Server {source.quality}
                  </button>
                ))}
              </div>
            )}

            {/* Sub / Dub Toggle */}
            <div className="flex p-1 bg-white/5 rounded-lg border border-white/10 shrink-0">
              <button 
                onClick={() => setActiveTab("sub")}
                className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${activeTab === 'sub' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                SUB
              </button>
              <button 
                onClick={() => setActiveTab("dub")}
                className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${activeTab === 'dub' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                DUB
              </button>
            </div>
          </div>
        </div>

        {/* Video Player Container */}
        <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(37,99,235,0.1)] border border-white/10 flex items-center justify-center">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-4 text-slate-400">
              <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
              <p className="font-semibold tracking-wide">Resolving Stream Servers...</p>
            </div>
          ) : streams?.nativeStream ? (
            <NativePlayer 
              url={streams.nativeStream.url} 
              title={`${animeTitle} - Episode ${episode.id}`}
              poster={animePosterImage}
              subtitles={streams.nativeStream.subtitles}
            />
          ) : currentUrl ? (
            <iframe 
              src={currentUrl}
              className="w-full h-full border-0"
              allowFullScreen
              allow="autoplay; fullscreen"
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full text-slate-500">
              Stream not available for this episode
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="flex flex-col sm:flex-row items-center sm:justify-between mt-4 gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <button
              onClick={handlePrev}
              disabled={!hasPrev}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                hasPrev 
                  ? "bg-slate-800 hover:bg-slate-700 text-white border border-white/10" 
                  : "bg-slate-900 text-slate-600 cursor-not-allowed border border-transparent"
              }`}
            >
              Previous
            </button>
            <button
              onClick={handleNext}
              disabled={!hasNext}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                hasNext 
                  ? "bg-slate-800 hover:bg-slate-700 text-white border border-white/10" 
                  : "bg-slate-900 text-slate-600 cursor-not-allowed border border-transparent"
              }`}
            >
              Next
            </button>
          </div>

          {/* Autoplay Toggle */}
          <div className="flex items-center gap-3 bg-slate-900/50 px-4 py-2 rounded-lg border border-white/5">
            <span className="text-sm font-medium text-slate-300">Autoplay Next</span>
            <button 
              onClick={toggleAutoplay}
              className={`relative w-12 h-6 rounded-full transition-colors ${autoplayNext ? 'bg-blue-600' : 'bg-slate-700'}`}
            >
              <div 
                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${autoplayNext ? 'translate-x-6' : 'translate-x-0'}`} 
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
