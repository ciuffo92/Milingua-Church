/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SupportedLanguage {
  code: string;
  name: string;
  localName: string;
  flag: string;
  speechCode: string; // for Web Speech API e.g. "it-IT", "en-US"
  ttsCode: string;
}

export interface SubtitleSegment {
  id: string;
  roomId: string;
  text: string;
  sourceLang: string;
  translations: Record<string, string>;
  timestamp: number;
  isFinal: boolean;
  speakerTag?: string;
  scriptureCitation?: string;
}

export interface Room {
  id: string;
  name: string;
  hostSourceLang: string;
  targetLanguages: string[];
  createdAt: number;
  isBroadcasting: boolean;
  audienceCount: number;
  churchPresetEnabled: boolean;
  customGlossary: string[];
  activeScripture?: string;
}

export interface AudienceReaction {
  id: string;
  type: 'amen' | 'heart' | 'clap' | 'pray' | 'thumbs_up';
  timestamp: number;
}

export interface UserSettings {
  audioTtsEnabled: boolean;
  ttsRate: number;
  ttsPitch: number;
  ttsVolume: number;
  fontSize: 'normal' | 'large' | 'xlarge' | 'huge';
  contrastMode: 'obsidian' | 'amoled' | 'paper' | 'warm';
  dualSubtitles: boolean;
  selectedLanguage: string;
  wakeLockActive: boolean;
  autoScroll: boolean;
}

export type AppView = 'home' | 'studio' | 'listener' | 'projector' | 'direct-mic' | 'guide';

export type UILanguage = 'it' | 'en' | 'es' | 'fr' | 'de' | 'pt' | 'ro' | 'uk' | 'ru' | 'zh' | 'ar';
