"use client";

import { Bell, User, LogOut } from "lucide-react";
import { useState } from "react";
import AuthModal from "./AuthModal";
import Link from "next/link";
import { getAvatarUrl } from "@/lib/avatars";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function NavbarActions({ user }: { user: any }) {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setIsMenuOpen(false);
    router.refresh();
    router.push('/');
  };

  const avatarUrl = getAvatarUrl(user?.user_metadata?.avatar_id);

  return (
    <>
      <button className="p-2 hover:bg-white/10 rounded-full transition-colors relative hidden sm:block">
        <Bell className="w-5 h-5 text-slate-300" />
        <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
      </button>

      {user ? (
        <div className="relative">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="ml-2 w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center border border-white/20 overflow-hidden hover:scale-105 transition-transform"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-bold text-white uppercase bg-gradient-to-br from-indigo-500 to-purple-600 w-full h-full flex items-center justify-center">{user.email?.charAt(0) || 'U'}</span>
            )}
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-2 flex flex-col z-[100]">
              <div className="px-4 py-2 border-b border-slate-800 mb-2">
                <p className="text-xs text-slate-400 truncate">{user.email}</p>
              </div>
              <Link 
                href="/profile" 
                onClick={() => setIsMenuOpen(false)}
                className="px-4 py-2 text-sm text-white hover:bg-slate-800 flex items-center gap-2"
              >
                <User className="w-4 h-4" /> Profile
              </Link>
              <button 
                onClick={handleSignOut}
                className="px-4 py-2 text-sm text-red-400 hover:bg-slate-800 flex items-center gap-2 text-left w-full"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          )}
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
    </>
  );
}
