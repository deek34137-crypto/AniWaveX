"use client";

import { Bell, User, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import AuthModal from "./AuthModal";
import UsernameModal from "./UsernameModal";
import Link from "next/link";
import { getAvatarUrl } from "@/lib/avatars";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function NavbarActions({ user: initialUser }: { user: any }) {
  const [currentUser, setCurrentUser] = useState<any>(initialUser);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isUsernameModalOpen, setIsUsernameModalOpen] = useState(false);
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    setCurrentUser(initialUser);
  }, [initialUser]);

  useEffect(() => {
    // 1. Fetch current session user on mount
    supabase.auth.getUser().then((res: any) => {
      if (res?.data?.user) setCurrentUser(res.data.user);
    });

    // 2. Real-time auth state subscription for immediate UI update on login/logout
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setCurrentUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (currentUser && !currentUser.user_metadata?.username) {
      setIsUsernameModalOpen(true);
    }
  }, [currentUser]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setIsMenuOpen(false);
    router.refresh();
    router.push('/');
  };

  const avatarUrl = getAvatarUrl(currentUser?.user_metadata?.avatar_id);
  const displayUsername = currentUser?.user_metadata?.username || currentUser?.email?.split('@')[0];

  return (
    <>
      <div className="relative hidden sm:block">
        <button 
          onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
          className="p-2 hover:bg-white/10 rounded-full transition-colors relative"
        >
          <Bell className="w-5 h-5 text-slate-300" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        {isNotificationsOpen && (
          <div className="absolute right-0 top-full mt-2 w-80 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-2 flex flex-col z-[100]">
            <div className="px-4 py-2 border-b border-slate-800 mb-2 flex justify-between items-center">
              <h3 className="font-semibold text-white">Notifications</h3>
            </div>
            <div className="px-4 py-3 hover:bg-slate-800/50 transition-colors">
              {!currentUser ? (
                <div>
                  <p className="text-sm text-slate-200">Welcome to AniWaveX! 🎉</p>
                  <p className="text-sm text-slate-400 mt-1">
                    <button 
                      onClick={() => {
                        setIsNotificationsOpen(false);
                        setIsAuthModalOpen(true);
                      }}
                      className="text-blue-400 hover:text-blue-300 font-medium hover:underline"
                    >
                      Sign in or sign up
                    </button>
                    {" "}to save your favorite anime and track your progress.
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-slate-200">Welcome back! 👋</p>
                  <p className="text-sm text-slate-400 mt-1">
                    You're all caught up. No new notifications.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {currentUser ? (
        <div className="relative">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="ml-2 w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center border border-white/20 overflow-hidden hover:scale-105 transition-transform relative"
          >
            {avatarUrl ? (
              <Image src={avatarUrl} alt="Avatar" fill sizes="36px" unoptimized className="object-cover" />
            ) : (
              <span className="text-sm font-bold text-white uppercase bg-gradient-to-br from-indigo-500 to-purple-600 w-full h-full flex items-center justify-center">{currentUser.email?.charAt(0) || 'U'}</span>
            )}
          </button>

          <div 
            className={`absolute right-0 top-full mt-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-2 flex flex-col z-[100] transition-all duration-200 origin-top-right ${isMenuOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'}`}
          >
            <div className="px-4 py-2 border-b border-slate-800 mb-2">
              <p className="text-sm font-bold text-white truncate">{displayUsername}</p>
              <p className="text-xs text-slate-400 truncate">{currentUser.email}</p>
            </div>
            <Link 
              href="/profile" 
              onClick={() => setIsMenuOpen(false)}
              className="px-4 py-2 text-sm text-white hover:bg-slate-800 flex items-center gap-2 transition-colors"
            >
              <User className="w-4 h-4" /> Profile
            </Link>
            <button 
              onClick={handleSignOut}
              className="px-4 py-2 text-sm text-red-400 hover:bg-slate-800 flex items-center gap-2 text-left w-full transition-colors"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      ) : (
        <button 
          onClick={() => setIsAuthModalOpen(true)}
          className="ml-2 w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center border border-white/20 overflow-hidden transition-colors"
        >
          <User className="w-5 h-5 text-white/80" />
        </button>
      )}

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      <UsernameModal isOpen={isUsernameModalOpen} onClose={() => setIsUsernameModalOpen(false)} />
    </>
  );
}
