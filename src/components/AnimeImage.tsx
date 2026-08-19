"use client";

import { useState } from "react";
import Image from "next/image";
import { Film } from "lucide-react";

interface AnimeImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  fill?: boolean;
  sizes?: string;
  priority?: boolean;
}

export default function AnimeImage({
  src,
  alt,
  className = "object-cover",
  fill = true,
  sizes,
  priority = false,
}: AnimeImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // If no source is provided or image failed to load, render stylish placeholder
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

  return (
    <Image
      src={src}
      alt={alt || "Anime poster"}
      fill={fill}
      sizes={sizes || "(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"}
      priority={priority}
      className={`${className} transition-opacity duration-300 ${
        isLoaded ? "opacity-100" : "opacity-0"
      }`}
      onLoad={() => setIsLoaded(true)}
      onError={() => setHasError(true)}
      unoptimized={src.startsWith("http://")}
    />
  );
}
