"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface WatchPartyMember {
  userId: string;
  username: string;
  avatarUrl?: string;
  isHost: boolean;
  lastPing: number;
}

export interface WatchPartySyncState {
  currentTime: number;
  paused: boolean;
  updatedAt: number;
  senderId: string;
  episodeId: number | string;
}

interface UseWatchPartyOptions {
  animeSlug: string;
  episodeId: number | string;
  user: any;
  onRemoteSeek: (targetSeconds: number) => void;
  onRemotePlay: () => void;
  onRemotePause: () => void;
  onRemoteEpisodeChange?: (episodeId: number | string) => void;
}

export function useWatchParty({
  animeSlug,
  episodeId,
  user,
  onRemoteSeek,
  onRemotePlay,
  onRemotePause,
  onRemoteEpisodeChange,
}: UseWatchPartyOptions) {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isPartyActive, setIsPartyActive] = useState<boolean>(false);
  const [isHost, setIsHost] = useState<boolean>(false);
  const [members, setMembers] = useState<WatchPartyMember[]>([]);
  const [partyStatusMessage, setPartyStatusMessage] = useState<string | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const isBroadcastingRef = useRef<boolean>(false);
  const ignoreNextSyncRef = useRef<boolean>(false);

  // Generate or join room from URL search parameter (e.g. ?party=room123)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);
    const partyParam = urlParams.get("party");
    if (partyParam) {
      setRoomId(partyParam);
      setIsPartyActive(true);
      // If joining an existing room from URL, not host initially
      setIsHost(false);
    }
  }, []);

  // Connect to Supabase Realtime Broadcast Channel
  useEffect(() => {
    if (!isPartyActive || !roomId) {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      return;
    }

    const supabase = createClient();
    const channelName = `watch_party_${roomId}`;
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { ack: false, self: false },
        presence: { key: user?.id || `guest_${Math.random().toString(36).substring(2, 7)}` },
      },
    });

    // 1. Listen for timestamp sync broadcasts
    channel
      .on("broadcast", { event: "playback_sync" }, (payload: { payload: WatchPartySyncState }) => {
        const sync = payload.payload;
        if (!sync) return;

        // If sync is for a different episode, notify
        if (sync.episodeId && sync.episodeId !== episodeId && onRemoteEpisodeChange) {
          onRemoteEpisodeChange(sync.episodeId);
        }

        // Apply time drift correction if > 2.0s
        ignoreNextSyncRef.current = true;
        onRemoteSeek(sync.currentTime);

        if (sync.paused) {
          onRemotePause();
        } else {
          onRemotePlay();
        }

        setTimeout(() => {
          ignoreNextSyncRef.current = false;
        }, 800);
      })
      // 2. Listen for play action
      .on("broadcast", { event: "play_action" }, () => {
        ignoreNextSyncRef.current = true;
        onRemotePlay();
        setTimeout(() => {
          ignoreNextSyncRef.current = false;
        }, 500);
      })
      // 3. Listen for pause action
      .on("broadcast", { event: "pause_action" }, () => {
        ignoreNextSyncRef.current = true;
        onRemotePause();
        setTimeout(() => {
          ignoreNextSyncRef.current = false;
        }, 500);
      })
      // 4. Presence tracking (who is in the room)
      .on("presence", { event: "sync" }, () => {
        const presenceState = channel.presenceState();
        const activeMembers: WatchPartyMember[] = [];

        Object.values(presenceState).forEach((presences: any) => {
          presences.forEach((p: any) => {
            activeMembers.push({
              userId: p.userId,
              username: p.username || "Anime Friend",
              avatarUrl: p.avatarUrl,
              isHost: Boolean(p.isHost),
              lastPing: Date.now(),
            });
          });
        });

        setMembers(activeMembers);
      })
      .subscribe(async (status: string) => {
        if (status === "SUBSCRIBED") {
          // Track presence
          await channel.track({
            userId: user?.id || `guest_${Math.random().toString(36).substring(2, 7)}`,
            username: user?.user_metadata?.username || user?.email?.split("@")[0] || "Anime Fan",
            avatarUrl: user?.user_metadata?.custom_avatar_url,
            isHost,
            episodeId,
            joinedAt: Date.now(),
          });
        }
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [isPartyActive, roomId, isHost, user, episodeId, onRemoteSeek, onRemotePlay, onRemotePause, onRemoteEpisodeChange]);

  // Host Action: Start a new Party Room
  const createParty = useCallback(() => {
    const newRoomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoomId(newRoomCode);
    setIsHost(true);
    setIsPartyActive(true);

    // Update URL with party code for easy copying
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("party", newRoomCode);
      window.history.replaceState({}, "", url.toString());
    }

    setPartyStatusMessage(`Party Room #${newRoomCode} created! Share the link with friends.`);
  }, []);

  // Join an existing room via Code
  const joinParty = useCallback((code: string) => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return;
    setRoomId(cleanCode);
    setIsHost(false);
    setIsPartyActive(true);

    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("party", cleanCode);
      window.history.replaceState({}, "", url.toString());
    }

    setPartyStatusMessage(`Joined Watch Party #${cleanCode}`);
  }, []);

  // Leave Party
  const leaveParty = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
    setIsPartyActive(false);
    setRoomId(null);
    setIsHost(false);
    setMembers([]);

    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("party");
      window.history.replaceState({}, "", url.toString());
    }

    setPartyStatusMessage("Left Watch Party.");
  }, []);

  // Broadcast timestamp sync to room members (Debounced from player onTimeUpdate)
  const broadcastSync = useCallback(
    (currentTime: number, paused: boolean) => {
      if (!channelRef.current || !isPartyActive || ignoreNextSyncRef.current) return;

      channelRef.current.send({
        type: "broadcast",
        event: "playback_sync",
        payload: {
          currentTime,
          paused,
          updatedAt: Date.now(),
          senderId: user?.id || "anon",
          episodeId,
        },
      });
    },
    [isPartyActive, user, episodeId]
  );

  // Broadcast Play
  const broadcastPlay = useCallback(() => {
    if (!channelRef.current || !isPartyActive || ignoreNextSyncRef.current) return;
    channelRef.current.send({
      type: "broadcast",
      event: "play_action",
      payload: { timestamp: Date.now() },
    });
  }, [isPartyActive]);

  // Broadcast Pause
  const broadcastPause = useCallback(() => {
    if (!channelRef.current || !isPartyActive || ignoreNextSyncRef.current) return;
    channelRef.current.send({
      type: "broadcast",
      event: "pause_action",
      payload: { timestamp: Date.now() },
    });
  }, [isPartyActive]);

  return {
    roomId,
    isPartyActive,
    isHost,
    members,
    partyStatusMessage,
    createParty,
    joinParty,
    leaveParty,
    broadcastSync,
    broadcastPlay,
    broadcastPause,
  };
}
