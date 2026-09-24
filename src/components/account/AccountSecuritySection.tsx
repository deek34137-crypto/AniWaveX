"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import {
  Shield,
  Mail,
  CheckCircle2,
  KeyRound,
  Eye,
  EyeOff,
  Monitor,
  Smartphone,
  LogOut,
  AlertTriangle,
  Loader2,
  Check,
} from "lucide-react";

interface AccountSecuritySectionProps {
  user: any;
}

export default function AccountSecuritySection({ user }: AccountSecuritySectionProps) {
  const router = useRouter();
  const { supabase } = useAuth();

  // Password state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Email change state
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);

  // Sign out states
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [showSignOutAllConfirm, setShowSignOutAllConfirm] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const email = user?.email || "";
  const isEmailVerified = Boolean(user?.email_confirmed_at);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setPasswordSuccess(true);
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSuccess(false), 4000);
    } catch (err: any) {
      setPasswordError(err.message || "Failed to update password.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleEmailUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || newEmail === email) return;

    setIsChangingEmail(true);
    setEmailStatus(null);
    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail.trim(),
      });

      if (error) throw error;

      setEmailStatus("Confirmation link sent! Check your new email address to complete verification.");
      setTimeout(() => {
        setShowEmailModal(false);
        setEmailStatus(null);
      }, 4000);
    } catch (err: any) {
      setEmailStatus(err.message || "Failed to initiate email change.");
    } finally {
      setIsChangingEmail(false);
    }
  };

  const handleSignOutCurrent = async () => {
    setIsSigningOut(true);
    try {
      await supabase.auth.signOut();
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("Sign out error:", err);
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleSignOutAll = async () => {
    setIsSigningOut(true);
    try {
      await fetch("/api/account/sessions?scope=all", { method: "DELETE" });
      await supabase.auth.signOut({ scope: "global" });
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("Sign out all error:", err);
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-400" />
          Account &amp; Security
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Manage your email, password credentials, active sessions, and multi-device access.
        </p>
      </div>

      {/* ── Email Card ── */}
      <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm sm:text-base">{email}</span>
                {isEmailVerified ? (
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold rounded-lg flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Verified
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-bold rounded-lg">
                    Unverified
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Used for security alerts and account recovery.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowEmailModal(true)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 rounded-xl text-xs font-bold transition-all shrink-0 active:scale-95"
          >
            Change Email
          </button>
        </div>
      </div>

      {/* ── Password Management Card ── */}
      <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Change Account Password</h3>
            <p className="text-xs text-slate-400 mt-0.5">Must be at least 6 characters.</p>
          </div>
        </div>

        {passwordError && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300">
            {passwordError}
          </div>
        )}

        {passwordSuccess && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>Password updated successfully!</span>
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-lg">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300">New Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={6}
                required
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-500 transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300">Confirm Password</label>
            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={6}
              required
              placeholder="••••••••"
              className="w-full bg-slate-950 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-500 transition-all font-mono"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isChangingPassword || !newPassword || !confirmPassword}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 active:scale-95"
            >
              {isChangingPassword ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>Update Password</span>
            </button>
          </div>
        </form>
      </div>

      {/* ── Active Sessions ── */}
      <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Monitor className="w-4 h-4 text-emerald-400" />
              Active Sessions
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Devices currently signed into your AniWaveX account.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowSignOutAllConfirm(true)}
            className="px-4 py-2 bg-red-950/40 hover:bg-red-900/40 text-red-400 border border-red-500/20 rounded-xl text-xs font-bold transition-all shrink-0 active:scale-95"
          >
            Sign Out All Devices
          </button>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-xs sm:text-sm">Current Browser / Device</span>
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold rounded-lg">
                  Active Now
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Authenticated session on AniWaveX web app.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowSignOutConfirm(true)}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* ── Change Email Modal ── */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-white text-base">Change Account Email</h3>
            <p className="text-xs text-slate-300">
              A verification link will be sent to your new email address to confirm ownership.
            </p>

            {emailStatus && (
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs rounded-xl">
                {emailStatus}
              </div>
            )}

            <form onSubmit={handleEmailUpdate} className="space-y-3">
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="new_email@example.com"
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-blue-500"
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isChangingEmail || !newEmail.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5"
                >
                  {isChangingEmail && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Send Confirmation</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Sign Out Confirm Modal ── */}
      {showSignOutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <LogOut className="w-5 h-5 text-red-400" />
              Sign out of AniWaveX?
            </h3>
            <p className="text-xs text-slate-300">
              You will be signed out on this device. You can sign back in anytime.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSignOutConfirm(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSignOutCurrent}
                disabled={isSigningOut}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5"
              >
                {isSigningOut && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sign Out All Devices Modal ── */}
      {showSignOutAllConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              Sign out of all devices?
            </h3>
            <p className="text-xs text-slate-300">
              This will revoke all active sessions across desktop browsers, mobile apps, and other devices.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSignOutAllConfirm(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSignOutAll}
                disabled={isSigningOut}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5"
              >
                {isSigningOut && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Sign Out Everywhere</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
