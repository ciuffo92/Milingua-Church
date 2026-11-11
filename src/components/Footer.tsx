/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { UILanguage } from '../types';
import { UI_TRANSLATIONS } from '../i18n/translations';
import { Smartphone, Monitor, ShieldCheck, Heart } from 'lucide-react';

interface FooterProps {
  uiLang: UILanguage;
  onNavigate: (view: any) => void;
}

export const Footer: React.FC<FooterProps> = ({ uiLang, onNavigate }) => {
  const t = UI_TRANSLATIONS[uiLang] || UI_TRANSLATIONS.it;

  return (
    <footer className="border-t border-slate-900 bg-slate-950/80 text-slate-400 py-10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-slate-900">
          <div>
            <div className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>{t.appName || 'Milingua - Live Translator'}</span>
              <span className="text-xs font-normal text-slate-500">·</span>
              <span className="text-xs font-normal text-emerald-400/90 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                {t.footerFreeCommunity || '100% Free & Open Community Use'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              {t.tagline} — {t.footerSubtext || 'Ottimizzato per culti religiosi, conferenze ed eventi pubblici su Android, iOS e Windows.'}
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800/80">
              <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
              <span>Android & iOS</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800/80">
              <Monitor className="w-3.5 h-3.5 text-indigo-400" />
              <span>Windows & Mac</span>
            </div>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>© {new Date().getFullYear()} {t.appName || 'Milingua - Live Translator'}. {t.allRightsReserved || 'Tutti i diritti riservati.'}</span>
            <span>·</span>
            <span className="flex items-center gap-1 text-slate-400">
              {t.createdForCommunities || 'Creato per le comunità'} <Heart className="w-3 h-3 text-rose-500/80 inline fill-rose-500/20" />
            </span>
          </div>

          <div className="flex items-center gap-5">
            <button onClick={() => onNavigate('guide')} className="hover:text-slate-300 transition-colors">
              {t.navGuide}
            </button>
            <button onClick={() => onNavigate('projector')} className="hover:text-slate-300 transition-colors">
              {t.navProjector}
            </button>
            <button onClick={() => onNavigate('studio')} className="hover:text-slate-300 transition-colors">
              {t.navStudio}
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
