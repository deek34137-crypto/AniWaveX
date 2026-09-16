"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { User, Loader2, Check } from "lucide-react";
import { useRouter } from "next/navigation";

export default function UsernameForm({ currentUsername }: { currentUsername: string }) {
  const [username, setUsername] = useState(currentUsername || "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = username.trim();

    if (!cleanUsername) {
      setError("Username cannot be empty.");
      return;
    }

    if (cleanUsername.length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }

    if (cleanUsername.length > 25) {
      setError("Username must be 25 characters or fewer.");
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(cleanUsername)) {
      setError("Username can only contain letters, numbers, underscores, and hyphens.");
      return;
    }

    if (cleanUsername.toLowerCase() === currentUsername.toLowerCase()) {
      setError("This is already your current username.");
      return;
    }

    setIsSaving(true);
    setError("");
    setSuccess(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be logged in to update your username.");

      // Check if username is already taken by another account
      const { data: existingUser } = await supabase
        .from("profiles")
        .select("id")
        .ilike("username", cleanUsername)
        .neq("id", user.id)
        .maybeSingle();

      if (existingUser) {
        setError("This username is already taken. Please choose another.");
        setIsSaving(false);
        return;
      }

      // Update Supabase Auth user metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: { username: cleanUsername }
      });
      if (authError) throw authError;

      // Update public profiles table
      await supabase.from("profiles").upsert({
        id: user.id,
        username: cleanUsername,
        updated_at: new Date().toISOString(),
      });

      // Migrate local tier lists key if applicable
      try {
        if (currentUsername) {
          const oldKey = `aniwavex_tierlists_${currentUsername.toLowerCase()}`;
          const newKey = `aniwavex_tierlists_${cleanUsername.toLowerCase()}`;
          const oldData = localStorage.getItem(oldKey);
          if (oldData && !localStorage.getItem(newKey)) {
            localStorage.setItem(newKey, oldData);
          }
        }
      } catch {}

      setSuccess(true);
      router.refresh();
      setTimeout(() => setSuccess(false), 3500);
    } catch (err: any) {
      setError(err.message || "Failed to update username. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-xl max-w-xl">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-blue-500/10 rounded-lg">
          <User className="w-5 h-5 text-blue-500" />
        </div>
        <h3 className="text-xl font-bold text-white">Change Username</h3>
      </div>
      <p className="text-slate-400 text-sm mb-6">
        Update your public display name. Your public profile will be at <span className="text-blue-400 font-mono">/user/{username || "username"}</span>.
      </p>

      <form onSubmit={handleUpdate} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setError("");
            }}
            className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-colors placeholder:text-slate-500 text-sm font-semibold"
            placeholder="Enter new username"
            required
            minLength={3}
            maxLength={25}
          />
          <p className="text-[11px] text-slate-500 mt-1.5">
            Allowed characters: A-Z, 0-9, underscores (_), and hyphens (-).
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm font-medium">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm font-medium flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            Username updated successfully!
          </div>
        )}

        <div className="pt-2">
          <button
            type="submit"
            disabled={isSaving || !username.trim() || username.trim().toLowerCase() === (currentUsername || "").toLowerCase()}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-md active:scale-95"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Username
          </button>
        </div>
      </form>
    </div>
  );
}
