/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { SubtitleSegment, UILanguage } from '../../types';
import { UI_TRANSLATIONS, SUPPORTED_LANGUAGES } from '../../i18n/translations';
import { roomSync } from '../../services/roomSyncService';
import {
  Maximize,
  Minimize,
  Sliders,
  Tv,
  ArrowLeft,
  BookOpen,
} from 'lucide-react';

interface ProjectorViewProps {
  roomId: string;
  uiLang: UILanguage;
  onBack: () => void;
}

export const ProjectorView: React.FC<ProjectorViewProps> = ({
  roomId,
  uiLang,
  onBack,
}) => {
  const t = UI_TRANSLATIONS[uiLang] || UI_TRANSLATIONS.it;
  const [segments, setSegments] = useState<SubtitleSegment[]>([]);
  const [interimText, setInterimText] = useState<string>('');
  const [targetLang, setTargetLang] = useState<string>('en');
  const [bgMode, setBgMode] = useState<'black' | 'green' | 'dark'>('black');
  const [fontSizePx, setFontSizePx] = useState<number>(44);
  const [linesCount, setLinesCount] = useState<number>(2);
  const [showDual, setShowDual] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [toolbarVisible, setToolbarVisible] = useState<boolean>(true);

  const idleTimerRef = useRef<any>(null);

  // Subscribe to room segments
  useEffect(() => {
    const existing = roomSync.getLocalSegments(roomId);
    if (existing.length > 0) {
      setSegments(existing);
    }

    const unsubscribe = roomSync.subscribe(roomId, (msg) => {
      if (msg.type === 'SEGMENT_BROADCAST') {
        setSegments(prev => [...prev.slice(-20), msg.segment]);
      } else if (msg.type === 'INTERIM_BROADCAST') {
        setInterimText(msg.text);
      } else if (msg.type === 'CLEAR_TRANSCRIPT' && msg.roomId === roomId) {
        setSegments([]);
        setInterimText('');
      }
    });

    return () => {
      unsubscribe();
    };
  }, [roomId]);

  // Toolbar auto-hide on inactivity
  useEffect(() => {
    const resetIdle = () => {
      setToolbarVisible(true);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        setToolbarVisible(false);
      }, 3500);
    };

    window.addEventListener('mousemove', resetIdle);
    window.addEventListener('keydown', resetIdle);
    resetIdle();

    return () => {
      window.removeEventListener('mousemove', resetIdle);
      window.removeEventListener('keydown', resetIdle);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const getBgClass = () => {
    switch (bgMode) {
      case 'green': return 'bg-[#00ff00] text-white';
      case 'dark': return 'bg-[#090d16] text-white';
      case 'black':
      default: return 'bg-black text-white';
    }
  };

  // Get active recent segments for display based on linesCount
  const displaySegments = segments.slice(-linesCount);
  const latestSegment = segments[segments.length - 1];

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col justify-between select-none overflow-hidden transition-colors duration-200 ${getBgClass()}`}
    >
      
      {/* Auto-fading Top Control Strip */}
      <div
        className={`p-4 transition-opacity duration-300 ${
          toolbarVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        } bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between text-white text-xs`}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-md"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t.exitProjector || 'Esci da Proiettore'}</span>
          </button>
          <span className="font-mono text-sm px-2.5 py-1 rounded bg-white/10 font-bold backdrop-blur-md">
            {t.roomCode || 'Stanza:'} {roomId}
          </span>
        </div>

        {/* Customization Bar */}
        <div className="flex items-center gap-3">
          {/* Target Language */}
          <div className="flex items-center gap-1 bg-black/50 px-2.5 py-1 rounded-lg border border-white/10 backdrop-blur-md">
            <span className="text-white/60">{t.languageLabel || 'Lingua:'}</span>
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
            >
              {SUPPORTED_LANGUAGES.map(l => (
                <option key={l.code} value={l.code} className="bg-slate-900 text-white">
                  {l.flag} {l.localName}
                </option>
              ))}
            </select>
          </div>

          {/* Background Mode */}
          <div className="flex items-center gap-1 bg-black/50 px-2.5 py-1 rounded-lg border border-white/10 backdrop-blur-md">
            <span className="text-white/60">{t.backgroundLabel || 'Sfondo:'}</span>
            <select
              value={bgMode}
              onChange={(e) => setBgMode(e.target.value as any)}
              className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
            >
              <option value="black" className="bg-slate-900">{t.bgBlackOption || 'Nero (Proiettore)'}</option>
              <option value="green" className="bg-slate-900">{t.bgGreenOption || 'Verde Chroma (OBS)'}</option>
              <option value="dark" className="bg-slate-900">{t.bgDarkOption || 'Scuro'}</option>
            </select>
          </div>

          {/* Font Size slider */}
          <div className="hidden sm:flex items-center gap-2 bg-black/50 px-2.5 py-1 rounded-lg border border-white/10 backdrop-blur-md">
            <span className="text-white/60">{t.sizeLabel || 'Dimensione:'}</span>
            <input
              type="range"
              min="28"
              max="64"
              value={fontSizePx}
              onChange={(e) => setFontSizePx(parseInt(e.target.value))}
              className="w-20 accent-indigo-400"
            />
            <span className="font-mono">{fontSizePx}px</span>
          </div>

          {/* Dual Subtitles Toggle */}
          <button
            onClick={() => setShowDual(!showDual)}
            className={`px-2.5 py-1 rounded-lg border text-xs font-medium backdrop-blur-md transition-colors ${
              showDual ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-black/50 border-white/10 text-white/60'
            }`}
          >
            {t.dualLang || 'Doppia Lingua'}
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-md"
            title={t.fullscreenBtn || 'Schermo Intero'}
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Scripture Citation Badge if available on latest segment */}
      {latestSegment?.scriptureCitation && (
        <div className="max-w-2xl mx-auto px-6 pt-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-sm sm:text-base font-bold shadow-lg backdrop-blur-sm animate-in fade-in">
            <BookOpen className="w-4 h-4" />
            <span>{latestSegment.scriptureCitation}</span>
          </div>
        </div>
      )}

      {/* Main Subtitles Viewport - Positioned at bottom third like cinema / church lower thirds */}
      <div className="max-w-6xl w-full mx-auto px-6 sm:px-12 pb-16 pt-8 space-y-6">
        
        {displaySegments.length === 0 && !interimText && (
          <div className="text-center py-20 text-white/40 font-mono text-sm tracking-wider">
            {t.projectorWaiting || 'MILINGUA - LIVE TRANSLATOR · SCHERMO SALA PRONTO · IN ATTESA DI TRASMISSIONE...'}
          </div>
        )}

        {displaySegments.map((seg, idx) => {
          const isLatest = idx === displaySegments.length - 1;
          const translated = seg.translations[targetLang] || seg.text;

          return (
            <div
              key={seg.id}
              className={`space-y-2 transition-all duration-300 ${
                isLatest ? 'opacity-100 scale-100' : 'opacity-70 scale-95'
              }`}
            >
              {/* Primary Translated Subtitle */}
              <p
                className="font-bold tracking-tight text-white subtitle-text-glow leading-snug"
                style={{ fontSize: `${fontSizePx}px` }}
              >
                {translated}
              </p>

              {/* Optional Dual Language Subtitle (Original language below) */}
              {showDual && targetLang !== seg.sourceLang && (
                <p
                  className="font-medium text-amber-200/90 subtitle-text-glow leading-normal"
                  style={{ fontSize: `${Math.round(fontSizePx * 0.65)}px` }}
                >
                  {seg.text}
                </p>
              )}
            </div>
          );
        })}

        {/* Interim live speech */}
        {interimText && (
          <p
            className="italic text-indigo-300/90 subtitle-text-glow leading-snug animate-pulse"
            style={{ fontSize: `${fontSizePx}px` }}
          >
            {interimText}
          </p>
        )}

      </div>

      {/* Bottom subtle watermark or clean bar */}
      <div className="p-3 text-center text-[10px] text-white/20 font-mono">
        {t.projectorWatermark || 'Milingua - Live Translator Presentation Screen'}
      </div>

    </div>
  );
};
