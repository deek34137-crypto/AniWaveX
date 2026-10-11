"use client";

import React, { useState } from "react";
import { Users, Copy, Check, LogOut, Play, Radio, Sparkles, X, Link } from "lucide-react";
import type { WatchPartyMember } from "@/lib/useWatchParty";

interface WatchPartyModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string | null;
  isPartyActive: boolean;
  isHost: boolean;
  members: WatchPartyMember[];
  onCreateParty: () => void;
  onJoinParty: (code: string) => void;
  onLeaveParty: () => void;
}

export default function WatchPartyModal({
  isOpen,
  onClose,
  roomId,
  isPartyActive,
  isHost,
  members,
  onCreateParty,
  onJoinParty,
  onLeaveParty,
}: WatchPartyModalProps) {
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  const handleCopyInviteLink = () => {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-slate-900/95 border border-white/15 rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
                <span>Social Watch Party</span>
                {isPartyActive && (
                  <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">Sync timestamps in real-time with friends.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* State 1: Active Party Room */}
        {isPartyActive && roomId ? (
          <div className="space-y-4">
            {/* Room Code Card */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-purple-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Room Code</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold">
                  {isHost ? "Host" : "Guest"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-2xl font-black font-mono tracking-widest text-white">{roomId}</span>
                <button
                  type="button"
                  onClick={handleCopyInviteLink}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-colors shadow-lg shadow-purple-600/30"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? "Link Copied!" : "Copy Invite"}</span>
                </button>
              </div>
            </div>

            {/* Active Members List */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-400 flex items-center justify-between">
                <span>Watching Together ({members.length || 1})</span>
                <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <Radio className="w-3 h-3" /> Realtime Synced
                </span>
              </span>

              <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                {members.length > 0 ? (
                  members.map((member, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-purple-600/30 border border-purple-500/40 flex items-center justify-center font-bold text-[10px] text-purple-300">
                          {member.username.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-slate-200">{member.username}</span>
                      </div>
                      {member.isHost && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          HOST
                        </span>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-center text-xs text-slate-400 bg-white/5 rounded-xl">
                    Waiting for friends to join... Share the room code!
                  </div>
                )}
              </div>
            </div>

            {/* Leave Party Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  onLeaveParty();
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 font-bold text-xs transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Leave Watch Party</span>
              </button>
            </div>
          </div>
        ) : (
          /* State 2: Create or Join Room */
          <div className="space-y-4">
            {/* Create Room Button */}
            <button
              type="button"
              onClick={onCreateParty}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-purple-600/20 transition-all hover:scale-[1.01]"
            >
              <Sparkles className="w-4 h-4" />
              <span>Host a Watch Party Room</span>
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">or join friends</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Join Room Input */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Enter 6-digit Room Code (e.g. AB12CD)"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  maxLength={8}
                  className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-950 border border-white/15 text-white placeholder-slate-500 text-sm font-mono uppercase tracking-widest focus:outline-none focus:border-purple-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (joinCodeInput.trim()) {
                      onJoinParty(joinCodeInput);
                    }
                  }}
                  disabled={!joinCodeInput.trim()}
                  className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-purple-300 font-bold text-xs border border-white/15 transition-colors"
                >
                  Join
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
