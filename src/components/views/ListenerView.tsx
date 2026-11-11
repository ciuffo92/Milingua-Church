/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { SubtitleSegment, UserSettings, UILanguage, SupportedLanguage } from '../../types';
import { UI_TRANSLATIONS, SUPPORTED_LANGUAGES } from '../../i18n/translations';
import { roomSync } from '../../services/roomSyncService';
import { speechSynthesizer } from '../../services/speechSynthesisService';
import {
  Headphones,
  Volume2,
  VolumeX,
  Type,
  Sun,
  Moon,
  Copy,
  Check,
  Heart,
  Sliders,
  ChevronDown,
  BookOpen,
  Eye,
  Search,
  Lock,
  Unlock,
  Radio,
} from 'lucide-react';

interface ListenerViewProps {
  roomId: string;
  uiLang: UILanguage;
  onLeaveRoom: () => void;
}

export const ListenerView: React.FC<ListenerViewProps> = ({
  roomId,
  uiLang,
  onLeaveRoom,
}) => {
  const t = UI_TRANSLATIONS[uiLang] || UI_TRANSLATIONS.it;
  
  // Settings & Preferences
  const [selectedLang, setSelectedLang] = useState<string>('en');
  const [audioTtsActive, setAudioTtsActive] = useState<boolean>(false);
  const [audioRate, setAudioRate] = useState<number>(1.0);
  const [audioVolume, setAudioVolume] = useState<number>(1.0);
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge' | 'huge'>('large');
  const [contrastMode, setContrastMode] = useState<'obsidian' | 'amoled' | 'paper' | 'warm'>('obsidian');
  const [dualSubtitles, setDualSubtitles] = useState<boolean>(false);
  const [wakeLockActive, setWakeLockActive] = useState<boolean>(false);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  
  // Data
  const [segments, setSegments] = useState<SubtitleSegment[]>([]);
  const [interimText, setInterimText] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [reactionSent, setReactionSent] = useState<boolean>(false);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);

  const wakeLockRef = useRef<any>(null);
  const segmentsEndRef = useRef<HTMLDivElement | null>(null);

  // Load existing segments and subscribe to live room broadcasts
  useEffect(() => {
    const existing = roomSync.getLocalSegments(roomId);
    if (existing.length > 0) {
      setSegments(existing);
    }

    const unsubscribe = roomSync.subscribe(roomId, (msg) => {
      if (msg.type === 'SEGMENT_BROADCAST') {
        setSegments(prev => {
          if (prev.some(s => s.id === msg.segment.id)) return prev;
          return [...prev, msg.segment];
        });

        // Trigger TTS if enabled
        if (audioTtsActive) {
          const textToSpeak = msg.segment.translations[selectedLang] || msg.segment.text;
          speechSynthesizer.speak(textToSpeak);
        }
      } else if (msg.type === 'INTERIM_BROADCAST') {
        setInterimText(msg.text);
      } else if (msg.type === 'CLEAR_TRANSCRIPT' && msg.roomId === roomId) {
        setSegments([]);
        setInterimText('');
      }
    });

    return () => {
      unsubscribe();
      speechSynthesizer.cancel();
      releaseWakeLock();
    };
  }, [roomId, selectedLang, audioTtsActive]);

  // Update speech synthesis settings
  useEffect(() => {
    speechSynthesizer.setEnabled(audioTtsActive);
    const langObj = SUPPORTED_LANGUAGES.find(l => l.code === selectedLang);
    if (langObj) {
      speechSynthesizer.setLanguage(langObj.ttsCode);
    }
    speechSynthesizer.setParams(audioRate, 1.0, audioVolume);
  }, [audioTtsActive, selectedLang, audioRate, audioVolume]);

  // Handle auto-scroll
  useEffect(() => {
    if (autoScroll) {
      segmentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [segments, interimText, autoScroll]);

  // Wake Lock handler
  const toggleWakeLock = async () => {
    if ('wakeLock' in navigator) {
      if (wakeLockActive) {
        releaseWakeLock();
      } else {
        try {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
          setWakeLockActive(true);
        } catch {
          setWakeLockActive(false);
        }
      }
    }
  };

  const releaseWakeLock = () => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = null;
    }
    setWakeLockActive(false);
  };

  const toggleAudioTts = () => {
    const nextState = !audioTtsActive;
    setAudioTtsActive(nextState);
    if (nextState) {
      speechSynthesizer.setEnabled(true);
      const langObj = SUPPORTED_LANGUAGES.find(l => l.code === selectedLang);
      if (langObj) {
        speechSynthesizer.setLanguage(langObj.ttsCode);
      }
      speechSynthesizer.unlockAudio();
      speechSynthesizer.testVoice();
    } else {
      speechSynthesizer.cancel();
      speechSynthesizer.setEnabled(false);
    }
  };

  const handleTestVoice = () => {
    speechSynthesizer.setEnabled(true);
    const langObj = SUPPORTED_LANGUAGES.find(l => l.code === selectedLang);
    if (langObj) {
      speechSynthesizer.setLanguage(langObj.ttsCode);
    }
    speechSynthesizer.testVoice();
  };

  const sendReaction = (type: 'amen' | 'heart' | 'pray') => {
    roomSync.broadcastReaction(roomId, {
      id: `react_${Date.now()}`,
      type,
      timestamp: Date.now(),
    });
    setReactionSent(true);
    setTimeout(() => setReactionSent(false), 1500);
  };

  // Font size class mapping
  const getFontSizeClass = () => {
    switch (fontSize) {
      case 'normal': return 'text-sm leading-relaxed';
      case 'large': return 'text-base sm:text-lg leading-relaxed';
      case 'xlarge': return 'text-lg sm:text-2xl leading-relaxed font-medium';
      case 'huge': return 'text-xl sm:text-3xl leading-relaxed font-medium';
    }
  };

  // Contrast Mode classes
  const getContrastClasses = () => {
    switch (contrastMode) {
      case 'amoled': return 'bg-black text-white';
      case 'paper': return 'bg-amber-50/90 text-slate-900';
      case 'warm': return 'bg-slate-900 text-amber-100';
      case 'obsidian':
      default: return 'bg-slate-950 text-slate-100';
    }
  };

  const filteredSegments = searchQuery.trim()
    ? segments.filter(s => {
        const tr = s.translations[selectedLang] || '';
        return s.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tr.toLowerCase().includes(searchQuery.toLowerCase());
      })
    : segments;

  return (
    <div className={`min-h-[calc(100vh-4rem)] flex flex-col transition-colors duration-200 ${getContrastClasses()}`}>
      
      {/* Top Listener Bar: Language & Audio & Settings Controls */}
      <div className="sticky top-16 z-30 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md px-4 sm:px-6 py-3">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-3">
          
          {/* Room Badge & Language Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2 py-1 rounded-md bg-slate-800 text-indigo-400 font-bold">
              {roomId}
            </span>

            {/* Target Language Dropdown */}
            <div className="relative">
              <select
                value={selectedLang}
                onChange={(e) => setSelectedLang(e.target.value)}
                className="bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-white font-semibold focus:outline-none focus:border-indigo-500 shadow-sm"
              >
                {SUPPORTED_LANGUAGES.map(l => (
                  <option key={l.code} value={l.code}>
                    {l.flag} {l.localName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2">
            
            {/* Earphone Audio TTS Toggle */}
            <button
              onClick={toggleAudioTts}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 shadow-sm ${
                audioTtsActive
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/25 ring-2 ring-emerald-400/50'
                  : 'bg-slate-900 border border-slate-700/80 text-slate-300 hover:text-white'
              }`}
              title={audioTtsActive ? t.audioTtsOn : t.audioTtsOff}
            >
              {audioTtsActive ? (
                <>
                  <Headphones className="w-3.5 h-3.5 text-white animate-pulse" />
                  <span>{t.audioTtsOn}</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                  <span>{t.audioEarphones || 'Audio Cuffie'}</span>
                </>
              )}
            </button>

            {/* Amen Reaction Button */}
            <button
              onClick={() => sendReaction('amen')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all active:scale-95 border ${
                reactionSent
                  ? 'bg-rose-600 text-white border-rose-500'
                  : 'bg-slate-900 border-slate-700/80 text-rose-300 hover:text-rose-200'
              }`}
            >
              <Heart className="w-3.5 h-3.5 fill-rose-500/20" />
              <span>{t.btnSendAmen}</span>
            </button>

            {/* Display Settings Toggle */}
            <button
              onClick={() => setSettingsOpen(!settingsOpen)}
              className="p-1.5 rounded-xl bg-slate-900 border border-slate-700/80 text-slate-300 hover:text-white transition-colors"
              title={t.customizeDisplay || 'Personalizza Testo & Display'}
            >
              <Sliders className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* Expandable Settings Panel */}
        {settingsOpen && (
          <div className="max-w-4xl mx-auto mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            
            {/* Font Size */}
            <div className="space-y-1">
              <label className="text-slate-400 font-semibold">{t.fontSizeLabel}</label>
              <div className="flex rounded-lg bg-slate-900 p-0.5 border border-slate-800">
                {(['normal', 'large', 'xlarge', 'huge'] as const).map(size => (
                  <button
                    key={size}
                    onClick={() => setFontSize(size)}
                    className={`flex-1 py-1 rounded text-[11px] font-semibold transition-colors ${
                      fontSize === size ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {size === 'normal' ? 'A' : size === 'large' ? 'A+' : size === 'xlarge' ? 'A++' : 'MAX'}
                  </button>
                ))}
              </div>
            </div>

            {/* Contrast Mode */}
            <div className="space-y-1">
              <label className="text-slate-400 font-semibold">{t.themeBg || 'Tema Sfondo'}</label>
              <div className="flex rounded-lg bg-slate-900 p-0.5 border border-slate-800">
                {(['obsidian', 'amoled', 'paper', 'warm'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setContrastMode(mode)}
                    className={`flex-1 py-1 rounded text-[11px] font-semibold capitalize transition-colors ${
                      contrastMode === mode ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Dual Subtitles Toggle */}
            <div className="space-y-1">
              <label className="text-slate-400 font-semibold">{t.dualLang || 'Doppia Lingua'}</label>
              <button
                onClick={() => setDualSubtitles(!dualSubtitles)}
                className={`w-full py-1.5 px-2 rounded-lg border text-[11px] font-semibold flex items-center justify-between transition-colors ${
                  dualSubtitles
                    ? 'border-indigo-500 bg-indigo-950/40 text-indigo-200'
                    : 'border-slate-800 bg-slate-900 text-slate-400'
                }`}
              >
                <span>{t.showOriginal || 'Mostra Originale'}</span>
                {dualSubtitles ? <Check className="w-3.5 h-3.5 text-indigo-400" /> : <Eye className="w-3.5 h-3.5 opacity-40" />}
              </button>
            </div>

            {/* Wake Lock Toggle */}
            <div className="space-y-1">
              <label className="text-slate-400 font-semibold">{t.screenOn || 'Schermo Acceso'}</label>
              <button
                onClick={toggleWakeLock}
                className={`w-full py-1.5 px-2 rounded-lg border text-[11px] font-semibold flex items-center justify-between transition-colors ${
                  wakeLockActive
                    ? 'border-emerald-500 bg-emerald-950/40 text-emerald-200'
                    : 'border-slate-800 bg-slate-900 text-slate-400'
                }`}
              >
                <span>{wakeLockActive ? (t.lockActive || 'Blocco Attivo') : (t.activateLock || 'Attiva Blocco')}</span>
                {wakeLockActive ? <Lock className="w-3.5 h-3.5 text-emerald-400" /> : <Unlock className="w-3.5 h-3.5 opacity-40" />}
              </button>
            </div>

            {/* Audio Speed / Volume Slider (if TTS active) */}
            {audioTtsActive && (
              <div className="sm:col-span-2 md:col-span-4 pt-2 border-t border-slate-800/60 flex flex-wrap items-center gap-4 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <span>{t.voiceSpeed || 'Velocità Voce:'}</span>
                  <input
                    type="range"
                    min="0.75"
                    max="1.5"
                    step="0.05"
                    value={audioRate}
                    onChange={(e) => setAudioRate(parseFloat(e.target.value))}
                    className="w-24 accent-indigo-500"
                  />
                  <span className="font-mono text-slate-200">{audioRate}x</span>
                </div>

                <div className="flex items-center gap-2">
                  <span>{t.volumeLabel || 'Volume:'}</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={audioVolume}
                    onChange={(e) => setAudioVolume(parseFloat(e.target.value))}
                    className="w-24 accent-indigo-500"
                  />
                  <span className="font-mono text-slate-200">{Math.round(audioVolume * 100)}%</span>
                </div>

                <button
                  type="button"
                  onClick={handleTestVoice}
                  className="px-3 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Prova Voce Audio</span>
                </button>
              </div>
            )}

          </div>
        )}
      </div>

      {/* Main Subtitles Stream */}
      <div className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 overflow-y-auto space-y-4">
        
        {/* Search bar inside transcript */}
        {segments.length > 5 && (
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder || 'Cerca nella trascrizione del sermone...'}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-900/60 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        )}

        {filteredSegments.length === 0 && !interimText && (
          <div className="py-24 text-center space-y-3">
            <Radio className="w-12 h-12 mx-auto text-indigo-400/40 animate-pulse" />
            <h3 className="text-base font-bold text-slate-300">
              {t.connectedToRoom || 'Connesso alla Stanza'} {roomId}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {t.waitingSpeech} {t.subtitlesAppearHere || 'I sottotitoli appariranno qui istantaneamente.'}
            </p>
          </div>
        )}

        {/* Subtitle Cards */}
        {filteredSegments.map((seg) => {
          const translatedText = seg.translations[selectedLang] || seg.text;

          return (
            <div
              key={seg.id}
              className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                contrastMode === 'paper'
                  ? 'bg-white border-amber-200 shadow-sm text-slate-900'
                  : 'bg-slate-900/50 border-slate-800/80 shadow-md text-slate-100'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-slate-500 pb-1.5 border-b border-slate-800/40 font-mono">
                <span className="flex items-center gap-1.5">
                  <span>{new Date(seg.timestamp).toLocaleTimeString()}</span>
                  {seg.scriptureCitation && (
                    <span className="text-amber-400 font-semibold font-sans flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5 inline" />
                      {seg.scriptureCitation}
                    </span>
                  )}
                </span>
                <span className="uppercase">{selectedLang}</span>
              </div>

              {/* Translated text */}
              <p className={`mt-2.5 font-medium ${getFontSizeClass()}`}>
                {translatedText}
              </p>

              {/* Dual Subtitle: Original language below */}
              {dualSubtitles && selectedLang !== seg.sourceLang && (
                <p className="mt-2 text-xs text-slate-500 italic pt-2 border-t border-slate-800/30">
                  <span className="not-italic font-mono text-[10px] text-slate-400 mr-1.5 uppercase">
                    [{seg.sourceLang}]:
                  </span>
                  {seg.text}
                </p>
              )}
            </div>
          );
        })}

        {/* Interim live speech */}
        {interimText && (
          <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 text-indigo-300 italic text-base animate-pulse">
            <span className="text-xs font-mono font-bold uppercase not-italic text-indigo-400 mr-2">
              {t.speakerLabel || 'PARLANTE:'}
            </span>
            <span>{interimText}</span>
          </div>
        )}

        <div ref={segmentsEndRef} />
      </div>

      {/* Floating Auto-scroll & Reaction controls at bottom */}
      <div className="sticky bottom-4 z-20 max-w-4xl mx-auto px-4 w-full flex items-center justify-between pointer-events-none">
        {!autoScroll && (
          <button
            onClick={() => setAutoScroll(true)}
            className="pointer-events-auto px-3.5 py-1.5 rounded-full bg-indigo-600 text-white text-xs font-semibold shadow-lg shadow-indigo-600/40 hover:bg-indigo-500 flex items-center gap-1 transition-transform active:scale-95"
          >
            <span>{t.scrollToLatest || "Torna all'ultimo sottotitolo"}</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        )}

        <div className="ml-auto pointer-events-auto">
          {/* Leave Room Button */}
          <button
            onClick={onLeaveRoom}
            className="px-3 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-slate-400 hover:text-white text-xs transition-colors backdrop-blur-md"
          >
            {t.leaveRoom || 'Esci dalla Stanza'}
          </button>
        </div>
      </div>

    </div>
  );
};
