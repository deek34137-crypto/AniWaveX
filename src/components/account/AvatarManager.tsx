"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { AVATARS, getAvatarUrl, getFallbackInitials } from "@/lib/avatars";
import { Upload, Trash2, Check, Loader2, Sparkles, AlertCircle, X } from "lucide-react";

interface AvatarManagerProps {
  currentAvatarId?: string | null;
  customAvatarUrl?: string | null;
  username?: string | null;
  displayName?: string | null;
  onAvatarUpdated?: (newAvatar: { avatar_id?: string; custom_avatar_url?: string | null }) => void;
}

export default function AvatarManager({
  currentAvatarId,
  customAvatarUrl,
  username,
  displayName,
  onAvatarUpdated,
}: AvatarManagerProps) {
  const [activeAvatar, setActiveAvatar] = useState<string | null>(customAvatarUrl || currentAvatarId || "avatar_01");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"preset" | "upload">("preset");
  const [selectedPreset, setSelectedPreset] = useState<string>(currentAvatarId || "avatar_01");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resolvedAvatarUrl = getAvatarUrl(activeAvatar);
  const initials = getFallbackInitials(displayName || username);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setErrorMessage("Please select a JPEG, PNG, or WebP image.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrorMessage("Image file size must be less than 2MB.");
      return;
    }

    setUploadFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSavePreset = async () => {
    setIsUploading(true);
    setErrorMessage(null);
    try {
      const formData = new FormData();
      formData.append("presetId", selectedPreset);

      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update avatar");

      setActiveAvatar(selectedPreset);
      setSuccessMessage("Avatar updated!");
      if (onAvatarUpdated) {
        onAvatarUpdated({ avatar_id: selectedPreset, custom_avatar_url: null });
      }
      setTimeout(() => {
        setIsModalOpen(false);
        setSuccessMessage(null);
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save avatar.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveUpload = async () => {
    if (!uploadFile) {
      setErrorMessage("Please select an image file first.");
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    try {
      const formData = new FormData();
      formData.append("avatar", uploadFile);

      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload avatar");

      setActiveAvatar(data.custom_avatar_url);
      setSuccessMessage("Custom avatar uploaded successfully!");
      if (onAvatarUpdated) {
        onAvatarUpdated({ custom_avatar_url: data.custom_avatar_url });
      }
      setTimeout(() => {
        setIsModalOpen(false);
        setSuccessMessage(null);
        setUploadFile(null);
        setUploadPreview(null);
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err.message || "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!confirm("Are you sure you want to remove your custom avatar?")) return;

    setIsUploading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/profile/avatar", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to remove avatar");

      setActiveAvatar("avatar_01");
      if (onAvatarUpdated) {
        onAvatarUpdated({ avatar_id: "avatar_01", custom_avatar_url: null });
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to reset avatar.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 shadow-lg">
      <div className="flex flex-col sm:flex-row items-center gap-5">
        {/* Avatar Display */}
        <div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-slate-800 border-2 border-white/10 shadow-xl shrink-0">
          {resolvedAvatarUrl ? (
            <Image
              src={resolvedAvatarUrl}
              alt="Profile Avatar"
              fill
              sizes="96px"
              unoptimized
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-3xl">
              {initials}
            </div>
          )}
        </div>

        {/* Info & Action Controls */}
        <div className="flex-1 text-center sm:text-left space-y-2">
          <h3 className="text-base font-bold text-white">Profile Picture</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Upload a custom avatar (JPEG, PNG, WebP under 2MB) or choose an official anime style avatar.
          </p>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(true);
                setErrorMessage(null);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              Change Avatar
            </button>

            {customAvatarUrl && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                disabled={isUploading}
                className="px-3.5 py-2 bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 border border-white/10 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Remove Custom
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Change Avatar Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-white text-base">Select or Upload Avatar</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tab Switcher */}
            <div className="flex bg-slate-950 p-1.5 gap-1.5 mx-5 mt-4 rounded-xl border border-white/5">
              <button
                type="button"
                onClick={() => setActiveTab("preset")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  activeTab === "preset"
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Anime Presets
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("upload")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  activeTab === "upload"
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Upload Custom Image
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4">
              {errorMessage && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              {activeTab === "preset" ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-64 overflow-y-auto pr-1">
                    {Object.entries(AVATARS).map(([id, url]) => {
                      const isSelected = selectedPreset === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setSelectedPreset(id)}
                          className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all p-1 ${
                            isSelected
                              ? "border-blue-500 ring-2 ring-blue-500/50 scale-105"
                              : "border-white/10 hover:border-white/30 opacity-80 hover:opacity-100"
                          }`}
                        >
                          <div className="relative w-full h-full rounded-xl overflow-hidden bg-slate-800">
                            <Image src={url} alt={id} fill sizes="80px" unoptimized className="object-cover" />
                          </div>
                          {isSelected && (
                            <div className="absolute top-2 right-2 p-1 bg-blue-600 rounded-full text-white shadow-md">
                              <Check className="w-3 h-3" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={handleSavePreset}
                    disabled={isUploading}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    <span>Save Selected Avatar</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                  />

                  {uploadPreview ? (
                    <div className="flex flex-col items-center gap-3 p-4 bg-slate-950 rounded-2xl border border-white/10">
                      <div className="relative w-32 h-32 rounded-2xl overflow-hidden border-2 border-blue-500 shadow-xl">
                        <Image src={uploadPreview} alt="Preview" fill unoptimized className="object-cover" />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold"
                        >
                          Choose Different
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setUploadFile(null);
                            setUploadPreview(null);
                          }}
                          className="px-3 py-1.5 bg-red-950/60 text-red-400 rounded-lg text-xs font-bold"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-white/15 hover:border-blue-500/50 rounded-2xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all bg-slate-950/40 text-slate-400 hover:text-white"
                    >
                      <Upload className="w-8 h-8 text-blue-400" />
                      <p className="text-xs font-bold text-white">Click to browse or drag and drop</p>
                      <p className="text-[11px] text-slate-500">Supports PNG, JPEG, WebP (Max 2MB)</p>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleSaveUpload}
                    disabled={isUploading || !uploadFile}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    <span>Upload &amp; Save Avatar</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
