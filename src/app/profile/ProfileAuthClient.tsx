"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Mail, Lock, Sparkles, Film, Bookmark, RefreshCw } from "lucide-react";
import Image from "next/image";

export default function ProfileAuthClient() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;

        // Refresh to reload server session on /profile
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) throw error;

        if (data.session) {
          router.refresh();
        } else if (data.user) {
          setSuccessMessage("Account created successfully! If email confirmation is enabled, please check your inbox, then sign in.");
          setIsLogin(true);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-6 sm:py-10">
      {/* Brand & Intro */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl overflow-hidden shadow-xl shadow-blue-500/20 mb-4 border border-white/10 bg-slate-900 relative">
          <Image
            src="/logo.png"
            alt="AniWaveX"
            width={64}
            height={64}
            className="w-full h-full object-cover"
            priority
          />
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
          {isLogin ? "Welcome to AniWaveX" : "Create Your Account"}
        </h1>
        <p className="text-sm text-slate-400">
          {isLogin 
            ? "Sign in to access your watch history, watchlist, and custom profile" 
            : "Join AniWaveX to track your anime, sync with AniList, and more"}
        </p>
      </div>

      {/* Auth Card */}
      <div 
        className="border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl"
        style={{ backgroundColor: "#0b0f19" }}
      >
        {/* Toggle Segmented Tabs */}
        <div className="flex bg-slate-900/80 p-1 rounded-xl border border-white/5 mb-6">
          <button
            type="button"
            onClick={() => {
              setIsLogin(true);
              setError(null);
              setSuccessMessage(null);
            }}
            className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${
              isLogin 
                ? "bg-blue-600 text-white shadow-md" 
                : "text-slate-400 hover:text-white"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsLogin(false);
              setError(null);
              setSuccessMessage(null);
            }}
            className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${
              !isLogin 
                ? "bg-blue-600 text-white shadow-md" 
                : "text-slate-400 hover:text-white"
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="p-3 mb-4 text-xs sm:text-sm text-red-400 bg-red-950/60 border border-red-900/60 rounded-xl leading-relaxed">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="p-3 mb-4 text-xs sm:text-sm text-emerald-300 bg-emerald-950/60 border border-emerald-900/60 rounded-xl leading-relaxed">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-3 bg-slate-900/90 border border-slate-800 rounded-xl text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 bg-slate-900/90 border border-slate-800 rounded-xl text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 mt-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 text-sm"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isLogin ? "Sign In to Your Profile" : "Create Free Account"}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-400">
          {isLogin ? "Don't have an account yet?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
              setSuccessMessage(null);
            }}
            className="text-blue-400 hover:text-blue-300 font-semibold"
          >
            {isLogin ? "Sign up" : "Sign in"}
          </button>
        </div>
      </div>

      {/* Feature perks */}
      <div className="mt-8 grid grid-cols-2 gap-3 text-left">
        <div className="p-3 bg-slate-900/40 border border-white/5 rounded-xl">
          <Film className="w-4 h-4 text-cyan-400 mb-1.5" />
          <h4 className="text-xs font-semibold text-white">Watch History</h4>
          <p className="text-[11px] text-slate-400 mt-0.5">Resume episodes right where you left off</p>
        </div>
        <div className="p-3 bg-slate-900/40 border border-white/5 rounded-xl">
          <Bookmark className="w-4 h-4 text-blue-400 mb-1.5" />
          <h4 className="text-xs font-semibold text-white">Custom Watchlist</h4>
          <p className="text-[11px] text-slate-400 mt-0.5">Bookmark your favorite upcoming anime</p>
        </div>
        <div className="p-3 bg-slate-900/40 border border-white/5 rounded-xl">
          <RefreshCw className="w-4 h-4 text-emerald-400 mb-1.5" />
          <h4 className="text-xs font-semibold text-white">AniList Sync</h4>
          <p className="text-[11px] text-slate-400 mt-0.5">1-click import all your anime lists</p>
        </div>
        <div className="p-3 bg-slate-900/40 border border-white/5 rounded-xl">
          <Sparkles className="w-4 h-4 text-purple-400 mb-1.5" />
          <h4 className="text-xs font-semibold text-white">Custom Avatars</h4>
          <p className="text-[11px] text-slate-400 mt-0.5">Pick high-res anime avatars &amp; banners</p>
        </div>
      </div>
    </div>
  );
}
