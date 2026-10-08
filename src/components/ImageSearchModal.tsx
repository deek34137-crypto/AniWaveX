"use client";

import React, { useState, useRef, useEffect, useSyncExternalStore, useCallback } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { Camera, Upload, X, Loader2, Sparkles, AlertCircle, Play, Film, ExternalLink, ArrowRight } from "lucide-react";
import { searchAnimeByImage, TraceMoeAnimeMatch } from "@/lib/trace-moe";

const subscribe = () => () => {};

interface ImageSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFile?: File | null;
}

export default function ImageSearchModal({ isOpen, onClose, initialFile }: ImageSearchModalProps) {
  const isMounted = useSyncExternalStore(subscribe, () => true, () => false);
  const [selectedFile, setSelectedFile] = useState<File | null>(initialFile || null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [results, setResults] = useState<TraceMoeAnimeMatch[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // If initialFile is passed on mount or prop update, load it immediately
  useEffect(() => {
    if (initialFile && isOpen) {
      setSelectedFile(initialFile);
      setPreviewUrl(URL.createObjectURL(initialFile));
      setError(null);
      setResults([]);
    }
  }, [initialFile, isOpen]);

  // Execute image search
  const performSearch = useCallback(async (fileToSearch: File) => {
    setIsLoading(true);
    setError(null);
    try {
      const matches = await searchAnimeByImage(fileToSearch);
      setResults(matches);
      if (matches.length === 0) {
        setError("No matching anime found for this screenshot. Try a clearer frame without large text or overlays.");
      }
    } catch (err: any) {
      setError(err?.message || "Image search failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-search if initialFile is provided
  useEffect(() => {
    if (initialFile && isOpen) {
      performSearch(initialFile);
    }
  }, [initialFile, isOpen, performSearch]);

  // Global paste handler while modal is open
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            setError(null);
            setResults([]);
            performSearch(file);
            break;
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [isOpen, performSearch]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !isMounted) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError(null);
      setResults([]);
      performSearch(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError(null);
      setResults([]);
      performSearch(file);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setResults([]);
    setError(null);
  };

  const modalContent = (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl max-h-[92vh] bg-slate-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0 bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                Anime Screenshot Search
              </h2>
              <p className="text-xs text-slate-400">
                Identify anime titles, exact episode numbers, and jump straight to the scene.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
            aria-label="Close Screenshot Search"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {!previewUrl ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-white/20 hover:border-cyan-400/60 rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all bg-slate-950/40 hover:bg-slate-950/80 group"
            >
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 group-hover:bg-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto mb-4 border border-cyan-500/20 transition-transform group-hover:scale-110">
                <Upload className="w-7 h-7" />
              </div>
              <p className="text-base font-bold text-white mb-1">
                Drop screenshot here, or tap to browse
              </p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                Supports PNG, JPG, WEBP. You can also press <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[11px] text-cyan-300">Ctrl + V</kbd> anywhere to paste from clipboard.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Preview Box */}
              <div className="relative rounded-2xl overflow-hidden max-h-52 bg-black/80 flex items-center justify-center border border-white/10 shadow-inner">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Search query screenshot"
                  className="max-h-52 object-contain"
                />
                <button
                  type="button"
                  onClick={handleReset}
                  className="absolute top-2.5 right-2.5 p-1.5 bg-black/70 hover:bg-black text-white rounded-full transition-colors border border-white/10"
                  title="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Action Button if results not yet fetched */}
              {results.length === 0 && !isLoading && !error && (
                <button
                  type="button"
                  onClick={() => selectedFile && performSearch(selectedFile)}
                  className="w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Identify Anime Scene
                </button>
              )}

              {/* Loading State */}
              {isLoading && (
                <div className="p-6 bg-slate-950/60 rounded-2xl border border-white/10 flex flex-col items-center justify-center gap-3 text-center">
                  <Loader2 className="w-7 h-7 text-cyan-400 animate-spin" />
                  <div>
                    <p className="text-sm font-bold text-white">Scanning anime database...</p>
                    <p className="text-xs text-slate-400 mt-0.5">Matching video frame, episode number, and timestamps</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Results List */}
          {results.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Film className="w-3.5 h-3.5 text-cyan-400" />
                  Matched Episodes ({results.length})
                </h3>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs text-cyan-400 hover:underline font-semibold"
                >
                  Search another image
                </button>
              </div>

              <div className="space-y-3">
                {results.map((match, idx) => {
                  const similarityColor =
                    match.similarityPercent >= 88
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                      : match.similarityPercent >= 75
                      ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                      : "bg-slate-700/50 text-slate-300 border-slate-600";

                  return (
                    <div
                      key={`${match.anilistId}-${match.episode}-${idx}`}
                      className="p-3.5 sm:p-4 bg-slate-950/70 border border-white/10 hover:border-cyan-500/40 rounded-2xl transition-all flex flex-col sm:flex-row items-start sm:items-center gap-3.5 sm:gap-4 shadow-lg group"
                    >
                      {/* Anime Poster Thumbnail */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="relative w-16 sm:w-20 aspect-[2/3] rounded-xl overflow-hidden bg-slate-800 border border-white/10 shrink-0">
                          {match.coverImage ? (
                            <Image
                              src={match.coverImage}
                              alt={match.title}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform"
                              sizes="80px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-500">
                              <Film className="w-6 h-6" />
                            </div>
                          )}
                        </div>

                        {/* Screenshot Match Frame Preview */}
                        {match.previewImage && (
                          <div className="relative w-24 sm:w-28 aspect-video rounded-xl overflow-hidden bg-slate-950 border border-white/15 shrink-0 hidden xs:block">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={match.previewImage}
                              alt="Matched scene preview"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono text-cyan-300 font-bold">
                              {match.timestamp}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Info & Badges */}
                      <div className="flex-1 min-w-0 w-full">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full border ${similarityColor}`}>
                            {match.similarityPercent}% match
                          </span>
                          <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-600/20 text-blue-300 border border-blue-500/30">
                            Episode {match.episode || 1}
                          </span>
                          <span className="text-xs font-mono text-slate-400">
                            Scene: {match.timestamp}
                          </span>
                        </div>

                        <h4 className="text-sm sm:text-base font-bold text-white truncate mt-1.5 group-hover:text-cyan-400 transition-colors">
                          {match.title}
                        </h4>
                        {match.romajiTitle && match.romajiTitle !== match.title && (
                          <p className="text-xs text-slate-400 truncate">{match.romajiTitle}</p>
                        )}

                        {/* Action Buttons: 100% INTERNAL LINKS */}
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                          <Link
                            href={match.internalPlayUrl}
                            onClick={onClose}
                            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-cyan-500/20 hover:scale-[1.02] active:scale-95"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Watch Scene on AniWaveX</span>
                          </Link>

                          <Link
                            href={`/anime/${encodeURIComponent(match.slug)}`}
                            onClick={onClose}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold border border-white/10 transition-colors"
                          >
                            <span>Anime Info</span>
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
