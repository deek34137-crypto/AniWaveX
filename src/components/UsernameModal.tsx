"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface UsernameModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
}

export default function UsernameModal({ isOpen, onClose, user }: UsernameModalProps) {
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.updateUser({
        data: { username: username.trim() }
      });
      
      if (error) throw error;
      
      router.refresh();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to set username");
    } finally {
      setIsLoading(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 animate-in zoom-in-95 duration-200">
        <h2 className="text-2xl font-bold text-white mb-2">
          Choose a Username
        </h2>
        <p className="text-slate-400 mb-6 text-sm">
          Please set a username to complete your profile. This is how you'll be known in the community.
        </p>

        {error && (
          <div className="p-3 mb-4 text-sm text-red-400 bg-red-950/50 border border-red-900 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Username</label>
            <input 
              type="text" 
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. AnimeFan99"
              minLength={3}
              maxLength={20}
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading || !username.trim()}
            className="w-full py-3 mt-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Username
          </button>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
