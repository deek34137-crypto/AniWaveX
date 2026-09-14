"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Film } from "lucide-react";
import { getOptimizedImageUrl } from "@/lib/image-utils";

interface AnimeImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  fill?: boolean;
  sizes?: string;
  priority?: boolean;
  quality?: number;
  unoptimized?: boolean;
  targetWidth?: number;
}

export default function AnimeImage({
  src,
  alt,
  className = "object-cover",
  fill = true,
  sizes,
  priority = false,
  quality = 85,
  unoptimized,
  targetWidth,
}: AnimeImageProps) {
  const [useFallback, setUseFallback] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Reset fallback state if src changes
  useEffect(() => {
    setUseFallback(false);
    setHasError(false);
  }, [src]);

  // If no source is provided or both optimized & fallback images failed to load, render stylish placeholder
  if (!src || hasError) {
    const initials = alt
      ? alt
          .split(" ")
          .slice(0, 2)
          .map((w) => w[0])
          .join("")
          .toUpperCase()
      : "AX";

    return (
      <div className="w-full h-full absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-950/60 to-slate-950 flex flex-col items-center justify-center p-4 text-center border border-white/5 select-none">
        <div className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-2 shadow-inner">
          <Film className="w-6 h-6" />
        </div>
        <span className="text-xl font-black text-slate-400/80 tracking-widest uppercase">
          {initials}
        </span>
        <span className="text-[11px] font-medium text-slate-500 line-clamp-2 mt-1 px-2">
          {alt}
        </span>
      </div>
    );
  }

  // Infer optimal responsive width based on sizes if not explicitly provided
  let computedWidth = targetWidth;
  if (!computedWidth && sizes) {
    if (sizes.includes("100vw")) {
      computedWidth = 1400; // Banner size
    } else {
      computedWidth = 450; // High-density 2x poster card
    }
  }

  // Get edge-optimized WebP unless fallback is active
  const displaySrc = !useFallback
    ? getOptimizedImageUrl(src, { width: computedWidth, quality, format: "webp" })
    : src;

  const handleError = () => {
    if (!useFallback && displaySrc !== src) {
      // First failure: seamlessly fall back to original direct CDN source
      setUseFallback(true);
    } else {
      // Second failure: show placeholder
      setHasError(true);
    }
  };

  return (
    <Image
      src={displaySrc}
      alt={alt || "Anime poster"}
      fill={fill}
      sizes={sizes || "(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"}
      priority={priority}
      quality={quality}
      className={className}
      onError={handleError}
      unoptimized={unoptimized !== undefined ? unoptimized : displaySrc.startsWith("http://")}
    />
  );
}
