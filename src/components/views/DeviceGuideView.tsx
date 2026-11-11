/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { UILanguage } from '../../types';
import { UI_TRANSLATIONS } from '../../i18n/translations';
import { Smartphone, Apple, Monitor, CheckCircle2, Tv, Volume2, ShieldCheck, Zap } from 'lucide-react';

interface DeviceGuideViewProps {
  uiLang: UILanguage;
  onNavigate: (view: any) => void;
}

export const DeviceGuideView: React.FC<DeviceGuideViewProps> = ({ uiLang, onNavigate }) => {
  const t = UI_TRANSLATIONS[uiLang] || UI_TRANSLATIONS.it;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10">
      
      {/* Title */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
          {t.guideTitle}
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          {t.guideIntro || "Milingua - Live Translator è progettato per adattarsi automaticamente a qualsiasi schermo (smartphone, tablet, laptop e videoproiettori) senza richiedere l'installazione di app esterne."}
        </p>
      </div>

      {/* 3 Main Platforms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Android Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <Smartphone className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-white">{t.guideAndroid}</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            {t.guideAndroidText}
          </p>

          <div className="space-y-2 pt-2 border-t border-slate-800 text-xs text-slate-300">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{t.guideAndroidPwa}</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{t.guideAndroidWake}</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{t.guideAndroidBt}</span>
            </div>
          </div>
        </div>

        {/* Apple iOS Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <div className="w-12 h-12 rounded-xl bg-slate-200/10 text-slate-200 flex items-center justify-center">
            <Apple className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-white">{t.guideApple}</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            {t.guideAppleText}
          </p>

          <div className="space-y-2 pt-2 border-t border-slate-800 text-xs text-slate-300">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <span>{t.guideAppleSafari}</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <span>{t.guideAppleAudio}</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <span>{t.guideAppleMute}</span>
            </div>
          </div>
        </div>

        {/* Windows / Mac / Regia Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
            <Monitor className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-white">{t.guideWindows}</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            {t.guideWindowsText}
          </p>

          <div className="space-y-2 pt-2 border-t border-slate-800 text-xs text-slate-300">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <span>{t.guideWinHdmi}</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <span>{t.guideWinObs}</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <span>{t.guideWinMixer}</span>
            </div>
          </div>
        </div>

      </div>

      {/* OBS Setup Pro Tip */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
            <Tv className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">{t.obsGuideTitle || "Come configurare i sottotitoli in OBS Studio / vMix / ATEM"}</h3>
            <p className="text-xs text-slate-400">{t.obsGuideSub || "Ideale per la diretta streaming YouTube o Facebook della chiesa"}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-xs text-slate-300">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
            <span className="font-mono text-indigo-400 font-bold">{t.obsStep1Title || "1. Crea la Stanza"}</span>
            <p className="text-slate-400">{t.obsStep1Desc || "Avvia la trasmissione nello Studio Relatore e copia il link \"Schermo / OBS\"."}</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
            <span className="font-mono text-indigo-400 font-bold">{t.obsStep2Title || "2. Aggiungi Browser Source"}</span>
            <p className="text-slate-400">{t.obsStep2Desc || "In OBS seleziona Aggiungi → Browser, incolla l'URL, imposta larghezza 1920 e altezza 1080."}</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
            <span className="font-mono text-indigo-400 font-bold">{t.obsStep3Title || "3. Applica Filtro Chroma"}</span>
            <p className="text-slate-400">{t.obsStep3Desc || "Nella vista proiettore imposta sfondo \"Verde Chroma\" e in OBS aggiungi il filtro \"Chroma Key\" per rendere trasparente lo sfondo."}</p>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={() => onNavigate('studio')}
            className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md transition-colors"
          >
            {t.goToStudio || "Vai allo Studio Relatore"}
          </button>
        </div>
      </div>

    </div>
  );
};
