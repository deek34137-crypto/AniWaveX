"use client";

import { useState } from "react";
import { AVATARS } from "@/lib/avatars";
import { createClient } from "@/lib/supabase/client";
import { Check, Loader2 } from "lucide-react";

export default function AvatarPicker({ currentAvatarId }: { currentAvatarId?: string }) {
  const [selected, setSelected] = useState<string | null>(currentAvatarId || null);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const supabase = createClient();

  const handleSave = async () => {
    if (!selected || selected === currentAvatarId) return;
    setIsSaving(true);
    setSuccess(false);

    try {
      const { error } = await supabase.auth.updateUser({
        data: { avatar_id: selected }
      });

      if (error) throw error;
      setSuccess(true);
      // Auto-hide success message
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("Failed to update avatar", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-xl">
      <h3 className="text-xl font-bold text-white mb-2">Choose an Avatar</h3>
      <p className="text-slate-400 text-sm mb-6">Select a profile picture to personalize your account.</p>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 mb-8">
        {Object.entries(AVATARS).map(([id, url]) => (
          <button
            key={id}
            onClick={() => setSelected(id)}
            className={`relative aspect-square rounded-full overflow-hidden border-4 transition-all duration-300 hover:scale-105 ${
              selected === id 
                ? "border-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.5)] scale-105" 
                : "border-transparent opacity-70 hover:opacity-100"
            }`}
          >
            <img src={url} alt={id} className="w-full h-full object-cover bg-slate-800" />
            {selected === id && (
              <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                <div className="bg-blue-600 rounded-full p-1 shadow-lg">
                  <Check className="w-4 h-4 text-white" />
                </div>
              </div>
            )}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-end gap-4">
        {success && <span className="text-emerald-400 font-semibold text-sm">Avatar updated!</span>}
        <button
          onClick={handleSave}
          disabled={isSaving || selected === currentAvatarId || !selected}
          className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all"
        >
          {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
          Save Avatar
        </button>
      </div>
    </div>
  );
}
