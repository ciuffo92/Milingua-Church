/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { IncomingMessage, ServerResponse } from 'http';
import { GoogleGenAI } from '@google/genai';

interface RoomData {
  id: string;
  room?: any;
  segments: any[];
  reactions: any[];
  updatedAt: number;
}

const memoryRooms = new Map<string, RoomData>();

function getOrCreateRoom(roomId: string): RoomData {
  if (!memoryRooms.has(roomId)) {
    memoryRooms.set(roomId, {
      id: roomId,
      segments: [],
      reactions: [],
      updatedAt: Date.now(),
    });
  }
  return memoryRooms.get(roomId)!;
}

function parseJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function sendJson(res: ServerResponse, status: number, data: any) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.end(JSON.stringify(data));
}

export async function handleDevApi(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = req.url || '';
  if (!url.startsWith('/api/')) return false;

  if (req.method === 'OPTIONS') {
    sendJson(res, 200, { ok: true });
    return true;
  }

  // POST /api/translate
  if (url === '/api/translate' && req.method === 'POST') {
    const { text, sourceLang, targetLang } = await parseJsonBody(req);
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey && text && sourceLang && targetLang) {
      try {
        const ai = new GoogleGenAI();
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `Translate the following spoken text accurately from ${sourceLang} to ${targetLang}. Preserve church/biblical nuance and tone. Return ONLY the translated string with no explanations or quotes:\n\n${text}`,
        });
        const translated = response.text ? response.text.trim() : text;
        sendJson(res, 200, { translatedText: translated });
        return true;
      } catch (e) {
        console.warn('Gemini translate error, falling back:', e);
      }
    }

    sendJson(res, 200, { translatedText: text });
    return true;
  }

  // Room endpoints: /api/rooms/:roomId/...
  const roomPublishMatch = url.match(/^\/api\/rooms\/([^/?]+)\/publish/);
  if (roomPublishMatch && req.method === 'POST') {
    const roomId = decodeURIComponent(roomPublishMatch[1]);
    const { segment } = await parseJsonBody(req);
    if (segment) {
      const room = getOrCreateRoom(roomId);
      room.segments.push(segment);
      if (room.segments.length > 200) room.segments.shift();
      room.updatedAt = Date.now();
    }
    sendJson(res, 200, { success: true });
    return true;
  }

  const roomPollMatch = url.match(/^\/api\/rooms\/([^/?]+)\/poll(?:\?(.*))?$/);
  if (roomPollMatch && req.method === 'GET') {
    const roomId = decodeURIComponent(roomPollMatch[1]);
    const query = new URLSearchParams(roomPollMatch[2] || '');
    const since = parseInt(query.get('since') || '0', 10);

    const room = getOrCreateRoom(roomId);
    const newSegments = room.segments.filter(s => s.timestamp > since);
    const newReactions = room.reactions.filter(r => r.timestamp > since);

    sendJson(res, 200, {
      roomId,
      room: room.room,
      segments: newSegments,
      reactions: newReactions,
    });
    return true;
  }

  const roomReactionMatch = url.match(/^\/api\/rooms\/([^/?]+)\/reaction/);
  if (roomReactionMatch && req.method === 'POST') {
    const roomId = decodeURIComponent(roomReactionMatch[1]);
    const { reaction } = await parseJsonBody(req);
    if (reaction) {
      const room = getOrCreateRoom(roomId);
      room.reactions.push(reaction);
      if (room.reactions.length > 100) room.reactions.shift();
    }
    sendJson(res, 200, { success: true });
    return true;
  }

  const roomUpdateMatch = url.match(/^\/api\/rooms\/([^/?]+)\/update/);
  if (roomUpdateMatch && req.method === 'POST') {
    const roomId = decodeURIComponent(roomUpdateMatch[1]);
    const { room } = await parseJsonBody(req);
    if (room) {
      const r = getOrCreateRoom(roomId);
      r.room = room;
      r.updatedAt = Date.now();
    }
    sendJson(res, 200, { success: true });
    return true;
  }

  const roomClearMatch = url.match(/^\/api\/rooms\/([^/?]+)\/clear/);
  if (roomClearMatch && req.method === 'POST') {
    const roomId = decodeURIComponent(roomClearMatch[1]);
    const r = getOrCreateRoom(roomId);
    r.segments = [];
    sendJson(res, 200, { success: true });
    return true;
  }

  return false;
}
