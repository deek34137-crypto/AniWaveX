"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Camera, Upload, X, Loader2, Sparkles, AlertCircle, Play } from "lucide-react";
import { searchAnimeByImage, TraceMoeAnimeMatch } from "@/lib/trace-moe";

interface ImageSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ImageSearchModal({ isOpen, onClose }: ImageSearchModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [results, setResults] = useState<TraceMoeAnimeMatch[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError(null);
      setResults([]);
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
    }
  };

  const handleSearch = async () => {
    if (!selectedFile) return;
    setIsLoading(true);
    setError(null);
    try {
      const matches = await searchAnimeByImage(selectedFile);
      setResults(matches);
      if (matches.length === 0) {
        setError("No matching anime found for this image. Try another screenshot with clearer characters or scenes.");
      }
    } catch (err: any) {
      setError(err?.message || "Image search failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setResults([]);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-slate-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white">Search Anime by Screenshot</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
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
              className="border-2 border-dashed border-white/20 hover:border-cyan-400/60 rounded-xl p-8 text-center cursor-pointer transition-colors bg-slate-950/40 hover:bg-slate-950/70"
            >
              <Upload className="w-10 h-10 text-cyan-400 mx-auto mb-3" />
              <p className="text-base font-semibold text-white">Tap to upload or drag an anime screenshot</p>
              <p className="text-xs text-slate-400 mt-1">Supports PNG, JPG, WEBP from your camera, gallery, or clipboard</p>
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
              <div className="relative rounded-xl overflow-hidden max-h-56 bg-black/60 flex items-center justify-center border border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Search query preview"
                  className="max-h-56 object-contain"
                />
                <button
                  type="button"
                  onClick={handleReset}
                  className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/90 text-white rounded-full transition-colors"
                  title="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Action Button */}
              {results.length === 0 && (
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleSearch}
                  className="w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Analyzing screenshot via Trace.moe...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Identify Anime
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Results List */}
          {results.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                  Top Matches ({results.length})
                </h3>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs text-cyan-400 hover:underline"
                >
                  Search another image
                </button>
              </div>

              <div className="space-y-2.5">
                {results.map((match) => (
                  <Link
                    key={match.anilistId}
                    href={`/anime/${match.anilistId}`}
                    onClick={onClose}
                    className="flex items-center gap-3.5 p-3 bg-slate-950/60 hover:bg-slate-800/80 border border-white/10 hover:border-cyan-500/40 rounded-xl transition-all group"
                  >
                    <div className="relative w-14 h-20 rounded-lg overflow-hidden shrink-0 bg-slate-800">
                      {match.coverImage && (
                        <Image
                          src={match.coverImage}
                          alt={match.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform"
                          sizes="60px"
                        />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          {match.similarityPercent}% match
                        </span>
                        {match.episode && (
                          <span className="text-xs text-slate-400">
                            Ep {match.episode} ({match.timestamp})
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm sm:text-base font-bold text-white truncate mt-1 group-hover:text-cyan-400 transition-colors">
                        {match.title}
                      </h4>
                      {match.romajiTitle && match.romajiTitle !== match.title && (
                        <p className="text-xs text-slate-400 truncate">{match.romajiTitle}</p>
                      )}
                    </div>

                    <div className="shrink-0 p-2 rounded-full bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500 group-hover:text-white transition-colors">
                      <Play className="w-4 h-4 fill-current" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
