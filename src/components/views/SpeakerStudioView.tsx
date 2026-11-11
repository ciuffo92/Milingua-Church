/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Room, SubtitleSegment, AudienceReaction, UILanguage } from '../../types';
import { UI_TRANSLATIONS, SUPPORTED_LANGUAGES } from '../../i18n/translations';
import { SpeechRecognitionManager } from '../../services/speechRecognitionService';
import { translateToAllLanguages, formatChurchSpeech } from '../../services/translationService';
import { roomSync } from '../../services/roomSyncService';
import { QrCodeModal } from '../modals/QrCodeModal';
import { ExportModal } from '../modals/ExportModal';
import {
  Mic,
  MicOff,
  Radio,
  Share2,
  Tv,
  Download,
  Trash2,
  BookOpen,
  Plus,
  X,
  Users,
  Heart,
  Volume2,
  Check,
  Languages,
  Sparkles,
  Sliders,
  RefreshCw,
  Edit3,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

interface SpeakerStudioViewProps {
  currentRoom: Room;
  uiLang: UILanguage;
  onOpenProjector: (roomId: string) => void;
  onUpdateRoom?: (updatedRoom: Room) => void;
  onLeaveStudio?: () => void;
}

export const SpeakerStudioView: React.FC<SpeakerStudioViewProps> = ({
  currentRoom: initialRoom,
  uiLang,
  onOpenProjector,
  onUpdateRoom,
  onLeaveStudio,
}) => {
  const t = UI_TRANSLATIONS[uiLang] || UI_TRANSLATIONS.it;
  const [room, setRoom] = useState<Room>(initialRoom);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [interimText, setInterimText] = useState<string>('');
  const [segments, setSegments] = useState<SubtitleSegment[]>([]);
  const [reactions, setReactions] = useState<AudienceReaction[]>([]);
  const [previewLang, setPreviewLang] = useState<string>(initialRoom.targetLanguages[0] || 'en');
  
  // Audio Devices (Mixer USB / Microfoni)
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  
  // Modals
  const [qrModalOpen, setQrModalOpen] = useState<boolean>(false);
  const [exportModalOpen, setExportModalOpen] = useState<boolean>(false);
  const [clearModalOpen, setClearModalOpen] = useState<boolean>(false);
  const [roomModalOpen, setRoomModalOpen] = useState<boolean>(false);

  // Edit / New Room Form State
  const [editRoomName, setEditRoomName] = useState<string>(initialRoom.name);
  const [editRoomId, setEditRoomId] = useState<string>(initialRoom.id);
  const [clearSegmentsOnSwitch, setClearSegmentsOnSwitch] = useState<boolean>(true);
  
  // Glossary Input
  const [glossaryInput, setGlossaryInput] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const speechManagerRef = useRef<SpeechRecognitionManager | null>(null);
  const segmentsEndRef = useRef<HTMLDivElement | null>(null);

  // Sync state if initialRoom prop changes from parent
  useEffect(() => {
    setRoom(initialRoom);
    setEditRoomName(initialRoom.name);
    setEditRoomId(initialRoom.id);
  }, [initialRoom]);

  // Initialize room sync and speech recognition
  useEffect(() => {
    // Load existing segments from local storage if available
    const existing = roomSync.getLocalSegments(room.id);
    if (existing.length > 0) {
      setSegments(existing);
    }

    // Subscribe to room sync events
    const unsubscribe = roomSync.subscribe(room.id, (msg) => {
      if (msg.type === 'REACTION') {
        setReactions(prev => [...prev.slice(-20), msg.reaction]);
      } else if (msg.type === 'CLEAR_TRANSCRIPT' && msg.roomId === room.id) {
        setSegments([]);
      }
    });

    // Create speech recognition manager
    const manager = new SpeechRecognitionManager({
      onInterim: (text) => {
        setInterimText(text);
        roomSync.broadcastInterim(room.id, text, room.hostSourceLang);
      },
      onFinal: async (rawText) => {
        setInterimText('');
        if (!rawText.trim()) return;

        // Apply church / event formatting
        const { formattedText, citation } = formatChurchSpeech(rawText, room.churchPresetEnabled);

        // Translate to active target languages
        const translations = await translateToAllLanguages(
          formattedText,
          room.hostSourceLang,
          room.targetLanguages
        );

        const newSegment: SubtitleSegment = {
          id: `seg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          roomId: room.id,
          text: formattedText,
          sourceLang: room.hostSourceLang,
          translations,
          timestamp: Date.now(),
          isFinal: true,
          scriptureCitation: citation,
        };

        setSegments(prev => [...prev, newSegment]);
        roomSync.broadcastSegment(newSegment);
      },
      onError: (err) => {
        setErrorMsg(err);
        setIsListening(false);
      },
      onAudioLevel: (level) => {
        setAudioLevel(level);
      },
      onStatusChange: (active) => {
        setIsListening(active);
      },
    });

    speechManagerRef.current = manager;

    return () => {
      unsubscribe();
      manager.stop();
    };
  }, [room.id, room.hostSourceLang, room.targetLanguages, room.churchPresetEnabled]);

  // Load available audio input devices (Mixer USB, Microfoni esterni, etc.)
  const loadAudioDevices = async () => {
    try {
      const devs = await SpeechRecognitionManager.getAudioDevices();
      setAudioDevices(devs);
      const saved = localStorage.getItem('milingua_audio_device_id');
      if (saved && devs.some(d => d.deviceId === saved)) {
        setSelectedDeviceId(saved);
      }
    } catch {}
  };

  useEffect(() => {
    loadAudioDevices();
  }, []);

  // Auto-scroll segments
  useEffect(() => {
    segmentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [segments, interimText]);

  const handleDeviceChange = async (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    try {
      localStorage.setItem('milingua_audio_device_id', deviceId);
    } catch {}
    await speechManagerRef.current?.setAudioDevice(deviceId);
  };

  const toggleMicrophone = async () => {
    if (isListening) {
      speechManagerRef.current?.stop();
      setIsListening(false);
      roomSync.broadcastRoomUpdate({ ...room, isBroadcasting: false });
    } else {
      setErrorMsg('');
      const sourceLangObj = SUPPORTED_LANGUAGES.find(l => l.code === room.hostSourceLang);
      const success = await speechManagerRef.current?.start(sourceLangObj?.speechCode || 'it-IT', selectedDeviceId);
      if (success) {
        setIsListening(true);
        roomSync.broadcastRoomUpdate({ ...room, isBroadcasting: true });
        // Refresh device labels if they were blank prior to first permission
        loadAudioDevices();
      }
    }
  };

  const handleSourceLangChange = (code: string) => {
    const updated = { ...room, hostSourceLang: code };
    setRoom(updated);
    roomSync.broadcastRoomUpdate(updated);
    const langObj = SUPPORTED_LANGUAGES.find(l => l.code === code);
    if (langObj) {
      speechManagerRef.current?.setLanguage(langObj.speechCode);
    }
  };

  const handleToggleTargetLang = (code: string) => {
    let nextLangs: string[];
    if (room.targetLanguages.includes(code)) {
      if (room.targetLanguages.length <= 1) return; // Keep at least one
      nextLangs = room.targetLanguages.filter(l => l !== code);
    } else {
      nextLangs = [...room.targetLanguages, code];
    }
    const updated = { ...room, targetLanguages: nextLangs };
    setRoom(updated);
    roomSync.broadcastRoomUpdate(updated);
  };

  const handleToggleChurchPreset = () => {
    const updated = { ...room, churchPresetEnabled: !room.churchPresetEnabled };
    setRoom(updated);
    roomSync.broadcastRoomUpdate(updated);
  };

  const handleAddGlossaryTerm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!glossaryInput.trim()) return;
    const term = glossaryInput.trim();
    if (!room.customGlossary.includes(term)) {
      const updated = { ...room, customGlossary: [...room.customGlossary, term] };
      setRoom(updated);
      roomSync.broadcastRoomUpdate(updated);
    }
    setGlossaryInput('');
  };

  const handleRemoveGlossaryTerm = (term: string) => {
    const updated = { ...room, customGlossary: room.customGlossary.filter(t => t !== term) };
    setRoom(updated);
    roomSync.broadcastRoomUpdate(updated);
  };

  const handleConfirmClear = () => {
    setSegments([]);
    roomSync.clearRoomTranscript(room.id);
    setClearModalOpen(false);
  };

  const handleDeleteRoom = () => {
    if (isListening) {
      speechManagerRef.current?.stop();
      setIsListening(false);
    }
    setSegments([]);
    roomSync.clearRoomTranscript(room.id);
    roomSync.deleteRoomFromLocal(room.id);
    setClearModalOpen(false);
    if (onLeaveStudio) {
      onLeaveStudio();
    }
  };

  const handleSaveRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = (editRoomId.trim().toUpperCase() || 'CULTO').replace(/[^A-Z0-9_-]/g, '');
    const cleanName = editRoomName.trim() || `Culto ${cleanId}`;

    if (isListening) {
      speechManagerRef.current?.stop();
      setIsListening(false);
    }

    if (clearSegmentsOnSwitch) {
      setSegments([]);
      roomSync.clearRoomTranscript(cleanId);
    }

    const updated: Room = {
      ...room,
      id: cleanId,
      name: cleanName,
      isBroadcasting: false,
    };

    setRoom(updated);
    roomSync.saveRoomToLocal(updated);
    roomSync.broadcastRoomUpdate(updated);
    onUpdateRoom?.(updated);
    setRoomModalOpen(false);
  };

  const handleGenerateRandomCode = () => {
    const randomDigits = Math.floor(100 + Math.random() * 900);
    const newCode = `CULTO-${randomDigits}`;
    setEditRoomId(newCode);
    setEditRoomName(`Servizio di Culto ${newCode}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      
      {/* Top Console Bar */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center shrink-0">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">{room.name}</h2>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-indigo-300 font-semibold border border-indigo-500/20">
                {room.id}
              </span>
              <button
                type="button"
                onClick={() => {
                  setEditRoomName(room.name);
                  setEditRoomId(room.id);
                  setRoomModalOpen(true);
                }}
                className="p-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-indigo-300 hover:text-white transition-colors"
                title="Modifica nome culto o codice stanza"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
              <span>{isListening ? (t.broadcastingActive || 'Trasmissione in corso') : (t.broadcastingPaused || 'Microfono in pausa')}</span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-mono">{room.audienceCount || 1} {t.onlineText || 'online'}</span>
              </span>
              {reactions.length > 0 && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1 text-rose-400">
                    <Heart className="w-3.5 h-3.5 fill-rose-500/20" />
                    <span className="font-mono">{reactions.length} Amen</span>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* New / Change Room Button */}
          <button
            type="button"
            onClick={() => {
              setEditRoomName(room.name);
              setEditRoomId(room.id);
              setRoomModalOpen(true);
            }}
            className="flex-1 sm:flex-none px-3.5 py-2 text-xs font-semibold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-indigo-500/30"
            title="Crea un nuovo culto o modifica il codice stanza"
          >
            <Plus className="w-4 h-4 text-indigo-400" />
            <span>Nuovo Culto</span>
          </button>

          {/* Share Room / QR */}
          <button
            onClick={() => setQrModalOpen(true)}
            className="flex-1 sm:flex-none px-3.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-slate-700/60"
          >
            <Share2 className="w-4 h-4 text-indigo-400" />
            <span>{t.shareRoom} (QR)</span>
          </button>

          {/* Projector Window */}
          <button
            onClick={() => onOpenProjector(room.id)}
            className="flex-1 sm:flex-none px-3.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-slate-700/60"
          >
            <Tv className="w-4 h-4 text-amber-400" />
            <span>{t.openProjector}</span>
          </button>

          {/* Export Transcript */}
          <button
            onClick={() => setExportModalOpen(true)}
            className="flex-1 sm:flex-none px-3.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-slate-700/60"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>{t.exportTranscript}</span>
          </button>

          {/* Clear screen / Trash */}
          <button
            type="button"
            onClick={() => setClearModalOpen(true)}
            className="flex-1 sm:flex-none px-3.5 py-2 text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-rose-500/30"
            title={t.clearTranscript || 'Pulisci Schermo / Elimina Culto'}
          >
            <Trash2 className="w-4 h-4 text-rose-400" />
            <span>Pulisci / Elimina</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} className="p-1 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Studio Grid: Left Controls, Right Live Transcript */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Broadcast Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Mic Big Toggle & Meter */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">{t.micStatus || 'Stato Microfono'}</h3>
                <p className="text-xs text-slate-400">
                  {isListening ? (t.micCapturingVoice || 'Il microfono cattura la tua voce in diretta') : (t.pressToSpeak || 'Premi per iniziare a parlare')}
                </p>
              </div>

              <button
                onClick={toggleMicrophone}
                className={`px-5 py-3 rounded-2xl text-xs font-bold flex items-center gap-2.5 transition-all active:scale-95 shadow-lg ${
                  isListening
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
                }`}
              >
                {isListening ? (
                  <>
                    <MicOff className="w-4 h-4" />
                    <span>{t.btnStopMic}</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    <span>{t.btnStartMic}</span>
                  </>
                )}
              </button>
            </div>

            {/* Audio Wave Meter */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                  {t.audioSensitivity || 'Sensibilità Audio Real-time'}
                </span>
                <span className="font-mono text-slate-300">{audioLevel}%</span>
              </div>
              <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div
                  className={`h-full transition-all duration-75 ${
                    audioLevel > 70 ? 'bg-amber-400' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${audioLevel}%` }}
                />
              </div>
            </div>

            {/* Audio Input Device Selector (Mixer USB / Microfoni) */}
            <div className="space-y-1.5 pt-3 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{t.audioDeviceSelect || 'Microfono / Scheda Audio Mixer'}</span>
                </label>
                <button
                  type="button"
                  onClick={loadAudioDevices}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 p-1 rounded hover:bg-slate-800 transition-colors"
                  title="Aggiorna lista microfoni collegati"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span className="text-[10px]">Rileva</span>
                </button>
              </div>

              <select
                value={selectedDeviceId}
                onChange={(e) => handleDeviceChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
              >
                <option value="">{t.defaultMicrophone || 'Predefinito di Sistema (Windows / Mac)'}</option>
                {audioDevices.map((dev, idx) => (
                  <option key={dev.deviceId || idx} value={dev.deviceId}>
                    🎤 {dev.label || `Ingresso Audio / Microfono ${idx + 1}`}
                  </option>
                ))}
              </select>
              
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {t.audioDeviceHint || 'Scegli il Mixer USB della chiesa o la scheda audio collegata al microfono del pastore.'}
              </p>
            </div>
          </div>

          {/* Language Configuration */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-5">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Languages className="w-4 h-4 text-indigo-400" />
                <span>{t.langConfig || 'Configurazione Lingue'}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {t.langConfigDesc || 'Seleziona la lingua in cui parli e quelle trasmesse ai partecipanti'}
              </p>
            </div>

            {/* Spoken Language */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">{t.sourceLang}</label>
              <select
                value={room.hostSourceLang}
                onChange={(e) => handleSourceLangChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
              >
                {SUPPORTED_LANGUAGES.map(l => (
                  <option key={l.code} value={l.code}>
                    {l.flag} {l.localName} ({l.name})
                  </option>
                ))}
              </select>
            </div>

            {/* Target Broadcast Languages Checkboxes */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>{t.targetLangs}</span>
                <span className="text-[11px] text-slate-500 font-normal">
                  {room.targetLanguages.length} {t.activeCount || 'attive'}
                </span>
              </label>

              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {SUPPORTED_LANGUAGES.filter(l => l.code !== room.hostSourceLang).map(lang => {
                  const isChecked = room.targetLanguages.includes(lang.code);
                  return (
                    <button
                      type="button"
                      key={lang.code}
                      onClick={() => handleToggleTargetLang(lang.code)}
                      className={`px-2.5 py-1.5 rounded-lg border text-xs flex items-center justify-between transition-colors text-left ${
                        isChecked
                          ? 'border-indigo-500/60 bg-indigo-950/40 text-indigo-200'
                          : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:text-slate-300'
                      }`}
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        <span>{lang.flag}</span>
                        <span className="truncate">{lang.localName}</span>
                      </span>
                      {isChecked && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Church & Worship Preset */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-amber-400" />
                  <span>{t.churchPreset}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {t.churchPresetDesc}
                </p>
              </div>

              <button
                type="button"
                onClick={handleToggleChurchPreset}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  room.churchPresetEnabled ? 'bg-indigo-600' : 'bg-slate-800'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    room.churchPresetEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Custom Glossary */}
            <div className="space-y-2 pt-3 border-t border-slate-800">
              <label className="text-xs font-semibold text-slate-300">
                {t.glossaryTitle} ({t.glossarySub || 'Nomi pastori, parole speciali'})
              </label>

              <form onSubmit={handleAddGlossaryTerm} className="flex gap-2">
                <input
                  type="text"
                  value={glossaryInput}
                  onChange={(e) => setGlossaryInput(e.target.value)}
                  placeholder={t.glossaryPlaceholder}
                  className="flex-1 px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t.btnAddTerm}</span>
                </button>
              </form>

              {room.customGlossary.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {room.customGlossary.map((term) => (
                    <span
                      key={term}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[11px]"
                    >
                      <span>{term}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveGlossaryTerm(term)}
                        className="hover:text-rose-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Live Transcription & Translation Feed (7 cols) */}
        <div className="lg:col-span-7 flex flex-col rounded-2xl border border-slate-800 bg-slate-900/60 p-5 min-h-[580px]">
          
          {/* Header of Feed: Language Tabs */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {t.previewLangLabel || 'Anteprima Lingua:'}
              </span>
              <div className="flex items-center gap-1 overflow-x-auto">
                <button
                  onClick={() => setPreviewLang(room.hostSourceLang)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                    previewLang === room.hostSourceLang
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {t.spokenBadge || 'Parlata'} ({room.hostSourceLang.toUpperCase()})
                </button>
                {room.targetLanguages.map(lang => (
                  <button
                    key={lang}
                    onClick={() => setPreviewLang(lang)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                      previewLang === lang
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {lang.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <span className="text-[11px] font-mono text-slate-500 shrink-0">
              {segments.length} {t.segmentsLabel || 'segmenti'}
            </span>
          </div>

          {/* Transcript Scroll Area */}
          <div className="flex-1 overflow-y-auto py-4 space-y-3.5 pr-2">
            {segments.length === 0 && !interimText && (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500">
                <Mic className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-xs">{t.waitingSpeech}</p>
                <p className="text-[11px] text-slate-600 mt-1">
                  {t.clickMicToStart || 'Premi "Avvia Microfono" a sinistra per iniziare a parlare'}
                </p>
              </div>
            )}

            {segments.map((seg) => {
              const displayText = previewLang === seg.sourceLang
                ? seg.text
                : (seg.translations[previewLang] || seg.text);

              return (
                <div
                  key={seg.id}
                  className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1 transition-all"
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <div className="flex items-center gap-2">
                      <span>{new Date(seg.timestamp).toLocaleTimeString()}</span>
                      {seg.scriptureCitation && (
                        <span className="text-amber-400/90 font-semibold flex items-center gap-1 font-sans">
                          <BookOpen className="w-3 h-3 inline" />
                          {seg.scriptureCitation}
                        </span>
                      )}
                    </div>
                    <span>{seg.sourceLang.toUpperCase()} → {previewLang.toUpperCase()}</span>
                  </div>

                  <p className="text-sm text-slate-100 font-medium leading-relaxed">
                    {displayText}
                  </p>

                  {/* If previewing translation, show small original text below for verification */}
                  {previewLang !== seg.sourceLang && (
                    <p className="text-[11px] text-slate-500 italic pt-1 border-t border-slate-900">
                      {t.originalLabel || 'Originale:'} {seg.text}
                    </p>
                  )}
                </div>
              );
            })}

            {/* Interim live speech display */}
            {interimText && (
              <div className="p-3 rounded-xl bg-indigo-950/20 border border-indigo-500/20 text-slate-400 text-sm italic">
                <span className="text-indigo-400 font-semibold font-mono text-xs mr-2">{t.liveBadge || 'IN DIRETTA...'}</span>
                <span>{interimText}</span>
              </div>
            )}

            <div ref={segmentsEndRef} />
          </div>

        </div>

      </div>

      {/* Modals */}
      <QrCodeModal
        roomId={room.id}
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        uiLang={uiLang}
      />

      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        segments={segments}
        roomName={room.name}
        uiLang={uiLang}
      />

      {/* Clear Transcript Confirmation Modal */}
      {clearModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Cancella Trascrizione Schermo</h3>
                <p className="text-xs text-slate-400">Pulisce i sottotitoli mostrati finora</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
              Vuoi cancellare i sottotitoli dallo schermo? Tutti i testi registrati finora verranno rimossi dallo Studio, dal videoproiettore della sala e dai telefoni dei partecipanti connessi.
            </p>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleConfirmClear}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors flex items-center justify-center gap-2 border border-slate-700"
              >
                <Trash2 className="w-4 h-4 text-amber-400" />
                <span>Pulisci Solo Trascrizione (Mantieni Stanza)</span>
              </button>

              <button
                type="button"
                onClick={handleDeleteRoom}
                className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20"
              >
                <X className="w-4 h-4" />
                <span>Elimina Culto Live ed Esci</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setClearModalOpen(false);
                  setEditRoomName(room.name);
                  setEditRoomId(room.id);
                  setRoomModalOpen(true);
                }}
                className="w-full py-2 px-4 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 font-semibold text-xs transition-colors flex items-center justify-center gap-2 border border-indigo-500/30"
              >
                <Plus className="w-4 h-4 text-indigo-400" />
                <span>Crea Nuovo Culto / Cambia Stanza</span>
              </button>

              <button
                type="button"
                onClick={() => setClearModalOpen(false)}
                className="w-full py-2 px-4 rounded-xl bg-transparent hover:bg-slate-800 text-slate-400 text-xs font-medium transition-colors"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New / Edit Room Modal */}
      {roomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center shrink-0">
                  <Radio className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Nuovo Culto o Modifica Stanza</h3>
                  <p className="text-xs text-slate-400">Imposta il nome e il codice per i partecipanti</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRoomModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRoom} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Nome del Culto o Evento:</label>
                <input
                  type="text"
                  value={editRoomName}
                  onChange={(e) => setEditRoomName(e.target.value)}
                  placeholder="Es: Servizio Domenicale, Incontro di Preghiera, Giovani..."
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">Codice Stanza (per QR e Telefoni):</label>
                  <button
                    type="button"
                    onClick={handleGenerateRandomCode}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors font-medium"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Genera Codice Casuale</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={editRoomId}
                  onChange={(e) => setEditRoomId(e.target.value.toUpperCase())}
                  placeholder="Es: CULTOLIVE, DOMENICA, GIOVANI"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-bold tracking-wider text-indigo-300 focus:border-indigo-500 focus:outline-none"
                  required
                />
                <p className="text-[11px] text-slate-500">
                  Questo codice apparirà nel link di condivisione e nel QR code che inquadrano i partecipanti.
                </p>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={clearSegmentsOnSwitch}
                    onChange={(e) => setClearSegmentsOnSwitch(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700 focus:ring-0"
                  />
                  <span className="text-xs text-slate-300">
                    Azzera la trascrizione per iniziare questo culto con lo schermo pulito
                  </span>
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setRoomModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Salva ed Entra nel Culto</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
