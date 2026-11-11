/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { AppView, UILanguage } from '../../types';
import { UI_TRANSLATIONS, SUPPORTED_LANGUAGES } from '../../i18n/translations';
import { SpeechRecognitionManager } from '../../services/speechRecognitionService';
import { translateText, formatChurchSpeech } from '../../services/translationService';
import { 
  Radio, 
  Headphones, 
  Tv, 
  Mic, 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  BookOpen, 
  Smartphone, 
  Volume2, 
  VolumeX, 
  Play, 
  Square,
  Languages
} from 'lucide-react';

interface HomeViewProps {
  uiLang: UILanguage;
  onNavigate: (view: AppView) => void;
  onJoinRoom: (roomId: string) => void;
  onStartRoom: (customId?: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  uiLang,
  onNavigate,
  onJoinRoom,
  onStartRoom,
}) => {
  const t = UI_TRANSLATIONS[uiLang] || UI_TRANSLATIONS.it;
  const [roomCodeInput, setRoomCodeInput] = useState('');
  
  // Test Sandbox State
  const [sandboxActive, setSandboxActive] = useState(false);
  const [sandboxSourceLang, setSandboxSourceLang] = useState('it');
  const [sandboxTargetLang, setSandboxTargetLang] = useState('en');
  const [sandboxOriginal, setSandboxOriginal] = useState('');
  const [sandboxInterim, setSandboxInterim] = useState('');
  const [sandboxTranslated, setSandboxTranslated] = useState('');
  const [sandboxAudioLevel, setSandboxAudioLevel] = useState(0);
  const [sandboxError, setSandboxError] = useState('');
  const speechManagerRef = useRef<SpeechRecognitionManager | null>(null);

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomCodeInput.trim()) {
      onJoinRoom(roomCodeInput.trim().toUpperCase());
    }
  };

  // Setup sandbox speech recognition
  useEffect(() => {
    const manager = new SpeechRecognitionManager({
      onInterim: (text) => {
        setSandboxInterim(text);
      },
      onFinal: async (text) => {
        const { formattedText } = formatChurchSpeech(text, true);
        setSandboxOriginal(formattedText);
        setSandboxInterim('');
        // Translate immediately
        const translated = await translateText(formattedText, sandboxSourceLang, sandboxTargetLang);
        setSandboxTranslated(translated);
      },
      onError: (err) => {
        setSandboxError(err);
        setSandboxActive(false);
      },
      onAudioLevel: (level) => {
        setSandboxAudioLevel(level);
      },
      onStatusChange: (active) => {
        setSandboxActive(active);
      },
    });

    speechManagerRef.current = manager;

    return () => {
      manager.stop();
    };
  }, [sandboxSourceLang, sandboxTargetLang]);

  const toggleSandbox = async () => {
    if (sandboxActive) {
      speechManagerRef.current?.stop();
      setSandboxActive(false);
    } else {
      setSandboxError('');
      const sourceLangObj = SUPPORTED_LANGUAGES.find(l => l.code === sandboxSourceLang);
      const success = await speechManagerRef.current?.start(sourceLangObj?.speechCode || 'it-IT');
      if (success) {
        setSandboxActive(true);
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-12">
      
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto space-y-5">
        <div className="inline-flex items-center gap-2 text-xs text-slate-400 border border-slate-800 bg-slate-900/60 rounded-full px-3.5 py-1">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>{t.freeNotice}</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight text-balance leading-tight">
          {t.heroTitle}
        </h1>

        <p className="text-sm sm:text-base text-slate-300 leading-relaxed text-balance">
          {t.heroDesc}
        </p>

        {/* Quick Room Join & Host Bar */}
        <div className="pt-2 max-w-lg mx-auto">
          <form onSubmit={handleJoinSubmit} className="flex flex-col sm:flex-row items-center gap-2">
            <input
              type="text"
              value={roomCodeInput}
              onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
              placeholder={t.roomCodePlaceholder || 'Codice stanza (es. CULTOLIVE o DOMENICA)'}
              className="w-full sm:flex-1 px-4 py-2.5 text-sm bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl text-white placeholder-slate-500 font-mono tracking-wider focus:outline-none shadow-inner"
            />
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="submit"
                className="flex-1 sm:flex-none px-4 py-2.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md shadow-indigo-600/30 transition-all active:scale-95 shrink-0"
              >
                {t.btnJoinRoom}
              </button>
              <button
                type="button"
                onClick={() => onStartRoom(roomCodeInput.trim() || 'CULTOLIVE')}
                className="flex-1 sm:flex-none px-4 py-2.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 rounded-xl transition-all active:scale-95 shrink-0"
                title="Avvia la trasmissione dello Studio come relatore con questa stanza"
              >
                {t.btnGoLive}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* 4 Feature Gateways (Anti-slop grid) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Card 1: Speaker Studio */}
        <div
          onClick={() => onNavigate('studio')}
          className="group cursor-pointer rounded-2xl border border-slate-800/80 bg-slate-900/50 hover:bg-slate-900/90 p-6 flex flex-col justify-between transition-all duration-200 hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/10"
        >
          <div>
            <div className="w-12 h-12 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <Radio className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white group-hover:text-indigo-200 transition-colors">
              {t.cardStudioTitle}
            </h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              {t.cardStudioDesc}
            </p>
          </div>
          <div className="mt-5 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs font-semibold text-indigo-400 group-hover:translate-x-1 transition-transform">
            <span>{t.btnGoLive}</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>

        {/* Card 2: Attendee Listen */}
        <div
          onClick={() => onNavigate('listener')}
          className="group cursor-pointer rounded-2xl border border-slate-800/80 bg-slate-900/50 hover:bg-slate-900/90 p-6 flex flex-col justify-between transition-all duration-200 hover:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-500/10"
        >
          <div>
            <div className="w-12 h-12 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <Headphones className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white group-hover:text-emerald-200 transition-colors">
              {t.cardListenTitle}
            </h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              {t.cardListenDesc}
            </p>
          </div>
          <div className="mt-5 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs font-semibold text-emerald-400 group-hover:translate-x-1 transition-transform">
            <span>{t.navListen}</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>

        {/* Card 3: Projector & OBS Screen */}
        <div
          onClick={() => onNavigate('projector')}
          className="group cursor-pointer rounded-2xl border border-slate-800/80 bg-slate-900/50 hover:bg-slate-900/90 p-6 flex flex-col justify-between transition-all duration-200 hover:border-amber-500/50 hover:shadow-xl hover:shadow-amber-500/10"
        >
          <div>
            <div className="w-12 h-12 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <Tv className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white group-hover:text-amber-200 transition-colors">
              {t.cardProjectorTitle}
            </h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              {t.cardProjectorDesc}
            </p>
          </div>
          <div className="mt-5 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs font-semibold text-amber-400 group-hover:translate-x-1 transition-transform">
            <span>{t.btnProjectorView}</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>

        {/* Card 4: Direct Phone Mic */}
        <div
          onClick={() => onNavigate('direct-mic')}
          className="group cursor-pointer rounded-2xl border border-slate-800/80 bg-slate-900/50 hover:bg-slate-900/90 p-6 flex flex-col justify-between transition-all duration-200 hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/10"
        >
          <div>
            <div className="w-12 h-12 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <Mic className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white group-hover:text-purple-200 transition-colors">
              {t.cardDirectMicTitle}
            </h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              {t.cardDirectMicDesc}
            </p>
          </div>
          <div className="mt-5 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs font-semibold text-purple-400 group-hover:translate-x-1 transition-transform">
            <span>{t.btnDirectMic}</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>

      </div>

      {/* Live Test Sandbox: Users can immediately test voice & translation without setting up a room */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg font-bold text-white">{t.testSandboxTitle}</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">{t.testSandboxDesc}</p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Source Lang */}
            <div className="flex items-center gap-1.5 text-xs text-slate-300">
              <span className="text-slate-500">{t.fromLabel || 'Da:'}</span>
              <select
                value={sandboxSourceLang}
                onChange={(e) => {
                  setSandboxSourceLang(e.target.value);
                  const langObj = SUPPORTED_LANGUAGES.find(l => l.code === e.target.value);
                  if (langObj) speechManagerRef.current?.setLanguage(langObj.speechCode);
                }}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
              >
                {SUPPORTED_LANGUAGES.map(l => (
                  <option key={l.code} value={l.code}>{l.flag} {l.localName}</option>
                ))}
              </select>
            </div>

            {/* Target Lang */}
            <div className="flex items-center gap-1.5 text-xs text-slate-300">
              <span className="text-slate-500">{t.toLabel || 'A:'}</span>
              <select
                value={sandboxTargetLang}
                onChange={(e) => setSandboxTargetLang(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
              >
                {SUPPORTED_LANGUAGES.map(l => (
                  <option key={l.code} value={l.code}>{l.flag} {l.localName}</option>
                ))}
              </select>
            </div>

            {/* Mic Toggle Button */}
            <button
              onClick={toggleSandbox}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all active:scale-95 ${
                sandboxActive
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30'
              }`}
            >
              {sandboxActive ? <Square className="w-3.5 h-3.5 fill-white" /> : <Play className="w-3.5 h-3.5 fill-white" />}
              <span>{sandboxActive ? (t.btnStopTest || 'Ferma Test') : (t.btnStartTest || 'Inizia Prova Vocale')}</span>
            </button>
          </div>
        </div>

        {/* Audio Meter Bar */}
        {sandboxActive && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>{t.realMicLevel || 'Livello Microfono Reale'}</span>
              <span className="font-mono">{sandboxAudioLevel}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-emerald-500 transition-all duration-75"
                style={{ width: `${sandboxAudioLevel}%` }}
              />
            </div>
          </div>
        )}

        {sandboxError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
            {sandboxError}
          </div>
        )}

        {/* Sandbox Output Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>{t.spokenTranscript || 'Trascrizione Parlata'} ({sandboxSourceLang.toUpperCase()})</span>
              {sandboxActive && <span className="text-[10px] text-emerald-400 font-normal">{t.listeningActive || 'In ascolto...'}</span>}
            </div>
            <div className="min-h-[70px] text-sm text-slate-200">
              {sandboxOriginal || sandboxInterim ? (
                <div>
                  <span>{sandboxOriginal}</span>
                  {sandboxInterim && <span className="text-slate-500 italic ml-1">{sandboxInterim}</span>}
                </div>
              ) : (
                <span className="text-slate-600 italic">
                  {sandboxActive ? (t.speakNowPrompt || 'Parla nel microfono adesso...') : (t.clickToStartTest || 'Clicca "Inizia Prova Vocale" e parla per provare.')}
                </span>
              )}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>{t.instantTranslation || 'Traduzione Istantanea'} ({sandboxTargetLang.toUpperCase()})</span>
              <Languages className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="min-h-[70px] text-sm font-medium text-indigo-300">
              {sandboxTranslated ? (
                <span>{sandboxTranslated}</span>
              ) : (
                <span className="text-slate-600 italic font-normal">
                  {t.translationPlaceholder || 'La traduzione istantanea apparirà qui in tempo reale.'}
                </span>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Multi-Device Support Strip */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-950 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1 text-center md:text-left">
          <h4 className="text-sm font-bold text-white flex items-center justify-center md:justify-start gap-2">
            <Smartphone className="w-4 h-4 text-indigo-400" />
            <span>{t.deviceOptimizedTitle || 'Ottimizzato per qualsiasi dispositivo e sistema operativo'}</span>
          </h4>
          <p className="text-xs text-slate-400">
            {t.deviceOptimizedDesc || 'Nessuna app da scaricare da Play Store o App Store: funziona direttamente nel browser web di smartphone Android, Apple iPhone/iPad e computer Windows/Mac.'}
          </p>
        </div>

        <button
          onClick={() => onNavigate('guide')}
          className="px-4 py-2 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-900 text-xs font-medium text-slate-200 hover:text-white transition-colors shrink-0"
        >
          {t.guideAndAdvice || (t.navGuide + ' & Consigli Tecnici')}
        </button>
      </div>

    </div>
  );
};
