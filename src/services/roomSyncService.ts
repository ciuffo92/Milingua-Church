/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Room, SubtitleSegment, AudienceReaction } from '../types';

type MessageType = 
  | { type: 'SEGMENT_BROADCAST'; segment: SubtitleSegment }
  | { type: 'INTERIM_BROADCAST'; text: string; sourceLang: string }
  | { type: 'ROOM_UPDATE'; room: Room }
  | { type: 'REACTION'; reaction: AudienceReaction }
  | { type: 'CLEAR_TRANSCRIPT'; roomId: string };

type ListenerCallback = (msg: MessageType) => void;

class RoomSyncService {
  private broadcastChannel: BroadcastChannel | null = null;
  private listeners: Set<ListenerCallback> = new Set();
  private pollInterval: number | null = null;
  private currentRoomId: string | null = null;
  private lastTimestamp: number = 0;

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('milingua_live_sync');
        this.broadcastChannel.onmessage = (event) => {
          this.notifyListeners(event.data);
        };
      } catch (e) {
        console.warn('BroadcastChannel not available:', e);
      }
    }
  }

  public subscribe(roomId: string, callback: ListenerCallback): () => void {
    this.currentRoomId = roomId;
    this.listeners.add(callback);

    // Start background poll to capture cross-device updates from server if available
    this.startServerPolling(roomId);

    return () => {
      this.listeners.delete(callback);
      if (this.listeners.size === 0) {
        this.stopServerPolling();
      }
    };
  }

  private notifyListeners(msg: MessageType) {
    this.listeners.forEach(cb => {
      try {
        cb(msg);
      } catch (err) {
        console.error('Error in room subscriber:', err);
      }
    });
  }

  public broadcastSegment(segment: SubtitleSegment) {
    // 1. Broadcast locally
    const msg: MessageType = { type: 'SEGMENT_BROADCAST', segment };
    this.broadcastChannel?.postMessage(msg);
    this.notifyListeners(msg);

    // 2. Persist in local storage
    this.saveSegmentToLocal(segment);

    // 3. Post to backend API if reachable
    this.postToServer('/api/rooms/' + encodeURIComponent(segment.roomId) + '/publish', {
      segment,
    });
  }

  public broadcastInterim(roomId: string, text: string, sourceLang: string) {
    const msg: MessageType = { type: 'INTERIM_BROADCAST', text, sourceLang };
    this.broadcastChannel?.postMessage(msg);
    this.notifyListeners(msg);
  }

  public broadcastReaction(roomId: string, reaction: AudienceReaction) {
    const msg: MessageType = { type: 'REACTION', reaction };
    this.broadcastChannel?.postMessage(msg);
    this.notifyListeners(msg);

    this.postToServer('/api/rooms/' + encodeURIComponent(roomId) + '/reaction', {
      reaction,
    });
  }

  public broadcastRoomUpdate(room: Room) {
    const msg: MessageType = { type: 'ROOM_UPDATE', room };
    this.broadcastChannel?.postMessage(msg);
    this.notifyListeners(msg);
    this.saveRoomToLocal(room);

    this.postToServer('/api/rooms/' + encodeURIComponent(room.id) + '/update', {
      room,
    });
  }

  public clearRoomTranscript(roomId: string) {
    const msg: MessageType = { type: 'CLEAR_TRANSCRIPT', roomId };
    this.broadcastChannel?.postMessage(msg);
    this.notifyListeners(msg);
    try {
      localStorage.removeItem(`milingua_segments_${roomId}`);
      localStorage.removeItem(`voxlumina_segments_${roomId}`);
    } catch {}

    this.postToServer('/api/rooms/' + encodeURIComponent(roomId) + '/clear', {});
  }

  // Local persistence helpers
  public getLocalRoom(roomId: string): Room | null {
    try {
      const raw = localStorage.getItem(`milingua_room_${roomId}`) || localStorage.getItem(`voxlumina_room_${roomId}`);
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  }

  public saveRoomToLocal(room: Room) {
    try {
      localStorage.setItem(`milingua_room_${room.id}`, JSON.stringify(room));
    } catch {}
  }

  public deleteRoomFromLocal(roomId: string) {
    try {
      localStorage.removeItem(`milingua_room_${roomId}`);
      localStorage.removeItem(`milingua_segments_${roomId}`);
      localStorage.removeItem(`voxlumina_room_${roomId}`);
      localStorage.removeItem(`voxlumina_segments_${roomId}`);
    } catch {}
  }

  public getLocalSegments(roomId: string): SubtitleSegment[] {
    try {
      const raw = localStorage.getItem(`milingua_segments_${roomId}`) || localStorage.getItem(`voxlumina_segments_${roomId}`);
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  }

  private saveSegmentToLocal(segment: SubtitleSegment) {
    try {
      const key = `milingua_segments_${segment.roomId}`;
      const existing = this.getLocalSegments(segment.roomId);
      // Keep last 150 segments in storage
      const updated = [...existing, segment].slice(-150);
      localStorage.setItem(key, JSON.stringify(updated));
    } catch {}
  }

  // Cross-device server sync
  private async postToServer(endpoint: string, body: any) {
    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch {
      // Local mode fallback
    }
  }

  private startServerPolling(roomId: string) {
    if (this.pollInterval) return;

    this.pollInterval = window.setInterval(async () => {
      try {
        const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/poll?since=${this.lastTimestamp}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.segments && data.segments.length > 0) {
            data.segments.forEach((seg: SubtitleSegment) => {
              if (seg.timestamp > this.lastTimestamp) {
                this.lastTimestamp = seg.timestamp;
                this.notifyListeners({ type: 'SEGMENT_BROADCAST', segment: seg });
              }
            });
          }
          if (data && data.reactions && data.reactions.length > 0) {
            data.reactions.forEach((reaction: AudienceReaction) => {
              this.notifyListeners({ type: 'REACTION', reaction });
            });
          }
          if (data && data.room) {
            this.notifyListeners({ type: 'ROOM_UPDATE', room: data.room });
          }
        }
      } catch {
        // Polling idle / offline fallback
      }
    }, 1200);
  }

  private stopServerPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }
}

export const roomSync = new RoomSyncService();
