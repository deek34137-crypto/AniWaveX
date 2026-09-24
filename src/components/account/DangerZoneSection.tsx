"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Trash2, Loader2, X, ShieldAlert } from "lucide-react";

export default function DangerZoneSection() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmText !== "DELETE_MY_ACCOUNT") {
      setErrorMsg("Confirmation phrase does not match.");
      return;
    }

    setIsDeleting(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/account/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: confirmText }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete account.");

      // Account deleted, push to home
      window.location.href = "/";
    } catch (err: any) {
      setErrorMsg(err.message || "Account deletion failed.");
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-bold text-red-400 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          Danger Zone
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Irreversible actions related to your AniWaveX account.
        </p>
      </div>

      <div className="border border-red-500/20 bg-red-950/10 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">Delete AniWaveX Account</h3>
            <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
              Permanently delete your AniWaveX profile, saved bookmarks, streaming progress, and customs.
              <strong className="text-slate-300"> This will NOT delete your external AniList or MyAnimeList account.</strong>
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowModal(true);
              setConfirmText("");
              setErrorMsg(null);
            }}
            className="px-5 py-2.5 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 rounded-xl text-xs font-bold transition-all shrink-0 active:scale-95"
          >
            Delete Account
          </button>
        </div>
      </div>

      {/* ── Multi-Step Delete Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="relative w-full max-w-lg bg-slate-900 border border-red-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-red-500/20 rounded-xl text-red-400">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">Delete Account Permanently</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-red-950/30 border border-red-500/20 text-xs text-slate-300 space-y-2 leading-relaxed">
              <p className="font-bold text-red-300">Warning: This action is permanent and cannot be undone.</p>
              <ul className="list-disc pl-4 space-y-1 text-slate-400">
                <li>All bookmarks, watching progress, and history will be deleted.</li>
                <li>Your profile showcase and tier lists will be permanently purged.</li>
                <li>Your connected AniList and MAL accounts will only be disconnected. <strong>Your actual AniList and MyAnimeList accounts remain safe on their respective platforms.</strong></li>
              </ul>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-300 text-xs rounded-xl">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleDeleteAccount} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300">
                  To confirm deletion, type <span className="font-mono text-red-400 select-all">DELETE_MY_ACCOUNT</span> below:
                </label>
                <input
                  type="text"
                  required
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="DELETE_MY_ACCOUNT"
                  className="w-full bg-slate-950 border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white font-mono outline-none focus:border-red-500 transition-colors"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={confirmText !== "DELETE_MY_ACCOUNT" || isDeleting}
                  className="px-5 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-lg flex items-center gap-1.5"
                >
                  {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span>Confirm Account Deletion</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
