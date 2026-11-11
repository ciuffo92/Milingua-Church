/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { UILanguage, SupportedLanguage } from '../../types';
import { UI_TRANSLATIONS, SUPPORTED_LANGUAGES } from '../../i18n/translations';
import { SpeechRecognitionManager } from '../../services/speechRecognitionService';
import { translateText, formatChurchSpeech } from '../../services/translationService';
import { speechSynthesizer } from '../../services/speechSynthesisService';
import {
  Mic,
  MicOff,
  Headphones,
  Languages,
  BookOpen,
  Volume2,
  Trash2,
  Lock,
  Unlock,
  Radio,
} from 'lucide-react';

interface DirectMicViewProps {
  uiLang: UILanguage;
}

export const DirectMicView: React.FC<DirectMicViewProps> = ({ uiLang }) => {
  const t = UI_TRANSLATIONS[uiLang] || UI_TRANSLATIONS.it;
  const [isListening, setIsListening] = useState<boolean>(false);
  const [sourceLang, setSourceLang] = useState<string>('it');
  const [targetLang, setTargetLang] = useState<string>('en');
  const [audioTts, setAudioTts] = useState<boolean>(true);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [wakeLockActive, setWakeLockActive] = useState<boolean>(false);
  const [isSpeakingTest, setIsSpeakingTest] = useState<boolean>(false);
  
  // Audio Devices
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(() => {
    return localStorage.getItem('milingua_direct_audio_device') || '';
  });

  const [segments, setSegments] = useState<Array<{ id: string; original: string; translated: string; time: string; bib?: string }>>([]);
  const [interim, setInterim] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const speechManagerRef = useRef<SpeechRecognitionManager | null>(null);
  const wakeLockRef = useRef<any>(null);
  const feedEndRef = useRef<HTMLDivElement | null>(null);

  // Keep live refs so async recognition callbacks always access the current state without recreating the manager
  const sourceLangRef = useRef<string>(sourceLang);
  const targetLangRef = useRef<string>(targetLang);
  const audioTtsRef = useRef<boolean>(audioTts);

  useEffect(() => {
    sourceLangRef.current = sourceLang;
  }, [sourceLang]);

  useEffect(() => {
    targetLangRef.current = targetLang;
    const targetObj = SUPPORTED_LANGUAGES.find(l => l.code === targetLang);
    if (targetObj) {
      speechSynthesizer.setLanguage(targetObj.ttsCode);
    }
  }, [targetLang]);

  useEffect(() => {
    audioTtsRef.current = audioTts;
    speechSynthesizer.setEnabled(audioTts);
  }, [audioTts]);

  // Load available audio devices
  const loadAudioDevices = async () => {
    try {
      const devices = await SpeechRecognitionManager.getAudioDevices();
      setAudioDevices(devices);
    } catch {}
  };

  useEffect(() => {
    loadAudioDevices();
  }, []);

  // Initialize Speech Recognition Manager ONCE on mount
  useEffect(() => {
    speechSynthesizer.setEnabled(true);
    const targetObj = SUPPORTED_LANGUAGES.find(l => l.code === targetLangRef.current);
    if (targetObj) {
      speechSynthesizer.setLanguage(targetObj.ttsCode);
    }

    const manager = new SpeechRecognitionManager({
      onInterim: (text) => {
        setInterim(text);
      },
      onFinal: async (rawText) => {
        setInterim('');
        if (!rawText.trim()) return;

        const currentSource = sourceLangRef.current;
        const currentTarget = targetLangRef.current;
        const shouldSpeak = audioTtsRef.current;

        const { formattedText, citation } = formatChurchSpeech(rawText, true);
        const translated = await translateText(formattedText, currentSource, currentTarget);

        const newSeg = {
          id: `dm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          original: formattedText,
          translated,
          time: new Date().toLocaleTimeString(),
          bib: citation,
        };

        setSegments(prev => [...prev, newSeg]);

        if (shouldSpeak) {
          const targetLangObj = SUPPORTED_LANGUAGES.find(l => l.code === currentTarget);
          if (targetLangObj) {
            speechSynthesizer.setLanguage(targetLangObj.ttsCode);
          }
          speechSynthesizer.setEnabled(true);
          speechSynthesizer.speak(translated);
        }
      },
      onError: (err) => {
        setErrorMsg(err);
        setIsListening(false);
      },
      onAudioLevel: (lvl) => {
        setAudioLevel(lvl);
      },
      onStatusChange: (active) => {
        setIsListening(active);
      },
    });

    speechManagerRef.current = manager;

    return () => {
      manager.stop();
      speechSynthesizer.cancel();
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [segments, interim]);

  const handleDeviceChange = async (newDeviceId: string) => {
    setSelectedDeviceId(newDeviceId);
    localStorage.setItem('milingua_direct_audio_device', newDeviceId);
    if (speechManagerRef.current) {
      await speechManagerRef.current.setAudioDevice(newDeviceId);
    }
  };

  const testEarphonesVoice = () => {
    speechSynthesizer.unlockAudio();
    speechSynthesizer.setEnabled(true);
    const targetObj = SUPPORTED_LANGUAGES.find(l => l.code === targetLang);
    if (targetObj) {
      speechSynthesizer.setLanguage(targetObj.ttsCode);
    }

    const testPhrases: Record<string, string> = {
      it: 'Audio cuffie Milingua attivo e funzionante.',
      en: 'Milingua earphone voice is active and working.',
      es: 'La voz en auriculares de Milingua está activa y funcionando.',
      fr: 'La voix dans les écouteurs de Milingua est active.',
      de: 'Milingua Kopfhörer-Audio ist aktiv und betriebsbereit.',
      pt: 'O áudio do fone de ouvido do Milingua está ativo.',
      ro: 'Sunetul căștilor Milingua este activ și funcționează.',
      uk: 'Голос у навушниках Milingua активовано.',
      ru: 'Голос в наушниках Milingua активен и работает.',
      zh: 'Milingua 耳机语音已成功激活并正在运行。',
      ar: 'صوت سماعات ميلينغوا نشط ويعمل بنجاح.',
    };

    const phrase = testPhrases[targetLang] || testPhrases.it;
    setIsSpeakingTest(true);
    speechSynthesizer.speak(phrase);
    setTimeout(() => setIsSpeakingTest(false), 2500);
  };

  const toggleMic = async () => {
    if (isListening) {
      speechManagerRef.current?.stop();
      setIsListening(false);
      speechSynthesizer.cancel();
    } else {
      setErrorMsg('');
      // Crucial: Unlock audio within user-initiated click event for mobile iOS/Android
      speechSynthesizer.unlockAudio();
      speechSynthesizer.setEnabled(audioTts);
      const targetObj = SUPPORTED_LANGUAGES.find(l => l.code === targetLang);
      if (targetObj) {
        speechSynthesizer.setLanguage(targetObj.ttsCode);
      }

      const sourceLangObj = SUPPORTED_LANGUAGES.find(l => l.code === sourceLang);
      const success = await speechManagerRef.current?.start(
        sourceLangObj?.speechCode || 'it-IT',
        selectedDeviceId || undefined
      );
      if (success) {
        setIsListening(true);
      }
    }
  };

  const toggleWakeLock = async () => {
    if ('wakeLock' in navigator) {
      if (wakeLockActive) {
        wakeLockRef.current?.release().catch(() => {});
        setWakeLockActive(false);
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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      
      {/* Header Info */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Mic className="w-5 h-5 text-purple-400" />
            <span>{t.cardDirectMicTitle}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            {t.cardDirectMicDesc}
          </p>
        </div>

        <button
          onClick={toggleWakeLock}
          className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
            wakeLockActive
              ? 'border-emerald-500 bg-emerald-950/40 text-emerald-200'
              : 'border-slate-800 bg-slate-950 text-slate-400'
          }`}
        >
          {wakeLockActive ? <Lock className="w-3.5 h-3.5 text-emerald-400" /> : <Unlock className="w-3.5 h-3.5" />}
          <span>{wakeLockActive ? (t.lockActive || 'Schermo Acceso') : (t.activateLock || 'Tieni Schermo Acceso')}</span>
        </button>
      </div>

      {/* Control Strip */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          
          {/* Source Lang */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400">{t.spokenLangSpeaker || 'Lingua Parlata (Oratore)'}</label>
            <select
              value={sourceLang}
              onChange={(e) => {
                const nextLang = e.target.value;
                setSourceLang(nextLang);
                const obj = SUPPORTED_LANGUAGES.find(l => l.code === nextLang);
                if (obj && speechManagerRef.current) {
                  speechManagerRef.current.setLanguage(obj.speechCode);
                }
              }}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
            >
              {SUPPORTED_LANGUAGES.map(l => (
                <option key={l.code} value={l.code}>{l.flag} {l.localName}</option>
              ))}
            </select>
          </div>

          {/* Target Lang */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400">{t.yourTargetLang || 'La tua Lingua (Traduzione)'}</label>
            <select
              value={targetLang}
              onChange={(e) => {
                const nextLang = e.target.value;
                setTargetLang(nextLang);
                const obj = SUPPORTED_LANGUAGES.find(l => l.code === nextLang);
                if (obj) {
                  speechSynthesizer.setLanguage(obj.ttsCode);
                }
              }}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
            >
              {SUPPORTED_LANGUAGES.map(l => (
                <option key={l.code} value={l.code}>{l.flag} {l.localName}</option>
              ))}
            </select>
          </div>

          {/* Earphone Audio TTS Toggle + Test Voice */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-400">{t.earphonesVoice || 'Audio Auricolari (Voce)'}</label>
              <button
                type="button"
                onClick={testEarphonesVoice}
                className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1 font-medium transition-colors"
                title="Ascolta una frase di prova per verificare il volume e le cuffie"
              >
                <Volume2 className={`w-3 h-3 ${isSpeakingTest ? 'animate-bounce text-emerald-400' : ''}`} />
                <span>{isSpeakingTest ? 'Riproduzione...' : 'Prova Voce'}</span>
              </button>
            </div>
            <button
              onClick={() => {
                const nextState = !audioTts;
                speechSynthesizer.unlockAudio();
                speechSynthesizer.setEnabled(nextState);
                setAudioTts(nextState);
              }}
              className={`w-full py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-colors ${
                audioTts
                  ? 'border-emerald-500 bg-emerald-950/40 text-emerald-200 shadow-sm shadow-emerald-950'
                  : 'border-slate-800 bg-slate-950 text-slate-400'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Headphones className="w-3.5 h-3.5" />
                <span>{audioTts ? (t.earphonesOn || 'Voce Cuffie ATTIVA') : (t.earphonesOff || 'Voce Cuffie Disattiva')}</span>
              </span>
              <span className={`w-2 h-2 rounded-full ${audioTts ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
            </button>
          </div>

        </div>

        {/* Audio Input Device Selector (Phone mic / Bluetooth headset / External) */}
        {audioDevices.length > 0 && (
          <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
            <label className="font-semibold text-slate-400 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-purple-400" />
              <span>{t.audioDeviceSelect || 'Microfono / Sorgente Audio:'}</span>
            </label>
            <div className="w-full sm:w-auto flex-1 max-w-md flex items-center gap-2">
              <select
                value={selectedDeviceId}
                onChange={(e) => handleDeviceChange(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none"
              >
                <option value="">{t.defaultMicrophone || 'Predefinito (Microfono Telefono / Cuffie)'}</option>
                {audioDevices.map((dev, idx) => (
                  <option key={dev.deviceId || idx} value={dev.deviceId}>
                    {dev.label || `Microfono ${idx + 1}`}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={loadAudioDevices}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                title="Ricarica dispositivi"
              >
                <Radio className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Big Mic Button */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            onClick={toggleMic}
            className={`w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg ${
              isListening
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/30'
            }`}
          >
            {isListening ? (
              <>
                <MicOff className="w-4 h-4" />
                <span>{t.stopListening || 'Ferma Ascolto'}</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                <span>{t.startDirectMic || 'Avvia Ascolto Microfono'}</span>
              </>
            )}
          </button>

          {isListening && (
            <div className="flex-1 w-full sm:w-auto flex items-center gap-3">
              <div className="flex-1 h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-purple-500 transition-all duration-75"
                  style={{ width: `${audioLevel}%` }}
                />
              </div>
              <span className="text-[11px] font-mono text-slate-400">{audioLevel}%</span>
            </div>
          )}

          {segments.length > 0 && (
            <button
              onClick={() => setSegments([])}
              className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t.clearFeed || 'Pulisci'}</span>
            </button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
          {errorMsg}
        </div>
      )}

      {/* Real-time Subtitles Feed */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 min-h-[400px] flex flex-col">
        <div className="flex-1 space-y-3 overflow-y-auto max-h-[500px] pr-1">
          {segments.length === 0 && !interim && (
            <div className="h-64 flex flex-col items-center justify-center text-center p-8 text-slate-500">
              <Headphones className="w-10 h-10 mb-2 opacity-30 text-purple-400" />
              <p className="text-xs font-medium">{t.waitingDirectMic || "In attesa dell'avvio del microfono..."}</p>
              <p className="text-[11px] text-slate-600 mt-1 max-w-sm">
                {t.directMicInstructions || "Collega i tuoi auricolari, premi \"Avvia Ascolto Microfono\" e posiziona lo smartphone verso il podio o l'altoparlante."}
              </p>
            </div>
          )}

          {segments.map((seg) => (
            <div
              key={seg.id}
              className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5"
            >
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>{seg.time}</span>
                {seg.bib && (
                  <span className="text-amber-400 font-sans font-semibold flex items-center gap-1">
                    <BookOpen className="w-3 h-3 inline" />
                    {seg.bib}
                  </span>
                )}
              </div>

              {/* Translated text */}
              <p className="text-base font-semibold text-purple-200">
                {seg.translated}
              </p>

              {/* Original spoken text */}
              <p className="text-xs text-slate-500 italic pt-1 border-t border-slate-900">
                {t.originalLabel || 'Originale:'} {seg.original}
              </p>
            </div>
          ))}

          {interim && (
            <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/30 text-purple-300 italic text-sm animate-pulse">
              <span className="text-xs font-mono font-bold uppercase not-italic text-purple-400 mr-2">
                {t.listeningBadge || 'IN ASCOLTO:'}
              </span>
              <span>{interim}</span>
            </div>
          )}

          <div ref={feedEndRef} />
        </div>
      </div>

    </div>
  );
};

