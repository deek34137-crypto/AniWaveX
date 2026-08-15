"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { KeyRound, Loader2, Eye, EyeOff } from "lucide-react";

export default function PasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const supabase = createClient();

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSaving(true);
    setError("");
    setSuccess(false);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) throw updateError;
      
      setSuccess(true);
      setPassword("");
      setConfirmPassword("");
      
      // Auto-hide success message
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update password");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-xl max-w-xl">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-blue-500/10 rounded-lg">
          <KeyRound className="w-5 h-5 text-blue-500" />
        </div>
        <h3 className="text-xl font-bold text-white">Update Password</h3>
      </div>
      <p className="text-slate-400 text-sm mb-6">Change your account password. Requires you to be currently logged in.</p>

      <form onSubmit={handleUpdate} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">New Password</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-colors placeholder:text-slate-500"
              placeholder="••••••••"
              required
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Confirm New Password</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-colors placeholder:text-slate-500"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm font-medium">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm font-medium">
            Password updated successfully!
          </div>
        )}

        <div className="pt-2">
          <button
            type="submit"
            disabled={isSaving || !password || !confirmPassword}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save New Password
          </button>
        </div>
      </form>
    </div>
  );
}
