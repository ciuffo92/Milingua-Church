/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppView, UILanguage } from '../types';
import { UI_TRANSLATIONS, SUPPORTED_LANGUAGES } from '../i18n/translations';
import { Globe, Radio, Mic, Tv, HelpCircle, Headphones, ChevronDown } from 'lucide-react';

interface HeaderProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  uiLang: UILanguage;
  onLangChange: (lang: UILanguage) => void;
  onGoLiveClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  uiLang,
  onLangChange,
  onGoLiveClick,
}) => {
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const t = UI_TRANSLATIONS[uiLang] || UI_TRANSLATIONS.it;
  const currentLangObj = SUPPORTED_LANGUAGES.find(l => l.code === uiLang) || SUPPORTED_LANGUAGES[0];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        
        {/* Zone 1: Single text element wordmark */}
        <button
          onClick={() => onNavigate('home')}
          className="text-left group flex items-center gap-2.5 focus:outline-none shrink-0"
        >
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30 group-hover:bg-indigo-500 transition-colors">
            <Radio className="w-4 h-4" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white whitespace-nowrap group-hover:text-indigo-200 transition-colors">
            {t.appName || 'Milingua - Live Translator'}
          </span>
        </button>

        {/* Zone 2: 4–5 clean single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-300">
          <button
            onClick={() => onNavigate('home')}
            className={`transition-colors whitespace-nowrap hover:text-white pb-0.5 ${
              currentView === 'home' ? 'text-white border-b-2 border-indigo-500 font-semibold' : 'text-slate-400'
            }`}
          >
            {t.navHome}
          </button>
          <button
            onClick={() => onNavigate('studio')}
            className={`transition-colors whitespace-nowrap hover:text-white pb-0.5 ${
              currentView === 'studio' ? 'text-white border-b-2 border-indigo-500 font-semibold' : 'text-slate-400'
            }`}
          >
            {t.navStudio}
          </button>
          <button
            onClick={() => onNavigate('listener')}
            className={`transition-colors whitespace-nowrap hover:text-white pb-0.5 ${
              currentView === 'listener' ? 'text-white border-b-2 border-indigo-500 font-semibold' : 'text-slate-400'
            }`}
          >
            {t.navListen}
          </button>
          <button
            onClick={() => onNavigate('projector')}
            className={`transition-colors whitespace-nowrap hover:text-white pb-0.5 ${
              currentView === 'projector' ? 'text-white border-b-2 border-indigo-500 font-semibold' : 'text-slate-400'
            }`}
          >
            {t.navProjector}
          </button>
          <button
            onClick={() => onNavigate('guide')}
            className={`transition-colors whitespace-nowrap hover:text-white pb-0.5 ${
              currentView === 'guide' ? 'text-white border-b-2 border-indigo-500 font-semibold' : 'text-slate-400'
            }`}
          >
            {t.navGuide}
          </button>
        </nav>

        {/* Zone 3: 1 primary action + Language Switcher */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Language Switcher */}
          <div className="relative">
            <button
              onClick={() => setLangMenuOpen(!langMenuOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-xs font-medium text-slate-200 transition-colors focus:outline-none"
              title={t.langMenuTooltip || "Change Interface Language"}
            >
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">{currentLangObj.localName}</span>
              <span className="sm:hidden">{currentLangObj.code.toUpperCase()}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {langMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setLangMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-48 max-h-80 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900 shadow-xl shadow-black/60 z-50 py-1.5 divide-y divide-slate-800/40">
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    {t.langMenuTitle || 'Lingua Sito / Language'}
                  </div>
                  {SUPPORTED_LANGUAGES.slice(0, 11).map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        onLangChange(lang.code as UILanguage);
                        setLangMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors hover:bg-slate-800 ${
                        uiLang === lang.code ? 'text-indigo-400 bg-slate-800/60 font-semibold' : 'text-slate-200'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span>{lang.flag}</span>
                        <span>{lang.localName}</span>
                      </span>
                      <span className="text-[10px] text-slate-500 uppercase">{lang.code}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Primary Action Button */}
          <button
            onClick={onGoLiveClick}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-md shadow-indigo-600/25 transition-all whitespace-nowrap shrink-0 active:scale-95"
          >
            <Radio className="w-3.5 h-3.5" />
            <span>{t.btnGoLive}</span>
          </button>
        </div>

      </div>

      {/* Mobile Sub-Navigation Bar */}
      <div className="md:hidden border-t border-slate-800/60 bg-slate-950/95 px-3 py-2 flex items-center justify-around gap-1 text-xs">
        <button
          onClick={() => onNavigate('home')}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-md ${
            currentView === 'home' ? 'text-indigo-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>{t.navHome}</span>
        </button>
        <button
          onClick={() => onNavigate('studio')}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-md ${
            currentView === 'studio' ? 'text-indigo-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>{t.navStudio}</span>
        </button>
        <button
          onClick={() => onNavigate('listener')}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-md ${
            currentView === 'listener' ? 'text-indigo-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>{t.navListen}</span>
        </button>
        <button
          onClick={() => onNavigate('projector')}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-md ${
            currentView === 'projector' ? 'text-indigo-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>{t.navProjector}</span>
        </button>
        <button
          onClick={() => onNavigate('guide')}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-md ${
            currentView === 'guide' ? 'text-indigo-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>{t.navGuide}</span>
        </button>
      </div>
    </header>
  );
};
