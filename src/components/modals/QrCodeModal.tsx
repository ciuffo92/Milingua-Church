/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, Copy, Check, ExternalLink, Printer } from 'lucide-react';
import { UILanguage } from '../../types';
import { UI_TRANSLATIONS } from '../../i18n/translations';

interface QrCodeModalProps {
  roomId: string;
  isOpen: boolean;
  onClose: () => void;
  uiLang: UILanguage;
}

export const QrCodeModal: React.FC<QrCodeModalProps> = ({
  roomId,
  isOpen,
  onClose,
  uiLang,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const t = UI_TRANSLATIONS[uiLang] || UI_TRANSLATIONS.it;

  const [customOrigin, setCustomOrigin] = useState<string>(() => {
    return localStorage.getItem('milingua_custom_domain') || '';
  });
  const [showAdvancedUrl, setShowAdvancedUrl] = useState<boolean>(false);

  const defaultOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://milingua.live';
  const activeOrigin = customOrigin.trim() ? customOrigin.trim().replace(/\/+$/, '') : defaultOrigin;
  const isDevPreview = activeOrigin.includes('run.app') || activeOrigin.includes('aistudio') || activeOrigin.includes('localhost');

  const roomUrl = `${activeOrigin}${typeof window !== 'undefined' ? window.location.pathname : ''}?room=${encodeURIComponent(roomId)}`;

  useEffect(() => {
    if (isOpen && roomId) {
      QRCode.toDataURL(roomUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#090d16',
          light: '#ffffff',
        },
      })
        .then(url => setQrDataUrl(url))
        .catch(err => console.error('QR code generation error:', err));
    }
  }, [isOpen, roomId, roomUrl]);

  const handleSaveCustomOrigin = (newVal: string) => {
    setCustomOrigin(newVal);
    if (newVal.trim()) {
      localStorage.setItem('milingua_custom_domain', newVal.trim());
    } else {
      localStorage.removeItem('milingua_custom_domain');
    }
  };

  if (!isOpen) return null;

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(roomUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          <h3 className="text-xl font-bold text-white">{t.qrCodeTitle}</h3>
          <p className="text-xs text-slate-400 mt-1">{t.qrCodeDesc}</p>

          <div className="mt-4 inline-block p-4 bg-white rounded-2xl shadow-lg">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR Code ${roomId}`}
                className="w-56 h-56 mx-auto rounded-lg object-contain"
              />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center text-slate-800 font-mono text-sm">
                {t.qrGenerating || 'Generazione QR...'}
              </div>
            )}
          </div>

          <div className="mt-4">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {t.roomCodeAnnounce || 'Codice Stanza da annunciare:'}
            </div>
            <div className="mt-1 font-mono text-2xl font-extrabold text-indigo-400 tracking-wider select-all">
              {roomId}
            </div>
          </div>

          {/* Link box */}
          <div className="mt-4 flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={roomUrl}
              className="flex-1 px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-300 font-mono select-all focus:outline-none"
            />
            <button
              onClick={handleCopy}
              className="px-3 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center gap-1.5 transition-colors shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? t.copied : t.copyLink}</span>
            </button>
          </div>

          {/* Notice about iOS Safari dev preview security cookies */}
          {isDevPreview && !customOrigin && (
            <div className="mt-4 text-left p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 space-y-2">
              <div className="font-semibold flex items-center gap-1.5 text-amber-300">
                <span>⚠️ Come sbloccare Safari su iPhone per questa anteprima:</span>
              </div>
              <p className="leading-relaxed text-[11px] text-slate-300">
                L&apos;errore <em>&quot;cookie di sicurezza bloccati&quot;</em> su iPhone avviene perché Safari blocca i cookie di autenticazione del server interno di Google (Google Cloud Run).
              </p>
              
              <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800 text-[11px] text-slate-300 space-y-1">
                <div className="font-semibold text-indigo-300">Se ti chiede il login o dice &quot;non hai le autorizzazioni&quot;:</div>
                <p className="text-slate-300">
                  L&apos;anteprima di sviluppo è privata: per visualizzarla da cellulare, Safari deve essere collegato con il tuo account Google (<strong>francesco.ciufolotti@gmail.com</strong>). Il QR ora usa automaticamente il link di condivisione <em>ais-pre</em>.
                </p>
                <div className="text-[10px] text-slate-400 mt-1">
                  💡 Suggerimento: apri Safari sull&apos;iPhone, vai su <code>google.it</code>, accedi con la tua email Google e poi inquadra il QR.
                </div>
              </div>

              <p className="leading-relaxed text-[11px] text-emerald-300 font-medium">
                ✅ <strong>Zero permessi o login nella versione finale:</strong> quando l&apos;app sarà pubblicata sul sito della chiesa o su Vercel/Netlify, <strong>nessun fedele dovrà accedere a Google né chiedere permessi</strong>.
              </p>
            </div>
          )}

          {/* Optional: Customize Base URL */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 text-left">
            <button
              type="button"
              onClick={() => setShowAdvancedUrl(!showAdvancedUrl)}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
            >
              <span>{showAdvancedUrl ? '▼ Nascondi impostazioni indirizzo QR' : '▶ Personalizza indirizzo per QR (es. dominio pubblico / server)'}</span>
            </button>

            {showAdvancedUrl && (
              <div className="mt-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <label className="block text-[11px] font-semibold text-slate-300">
                  Indirizzo Web pubblico o IP locale per i fedeli:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customOrigin}
                    onChange={(e) => handleSaveCustomOrigin(e.target.value)}
                    placeholder="https://milingua.turchiesa.it oppure https://tuosito.vercel.app"
                    className="flex-1 px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-200 font-mono placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                  {customOrigin && (
                    <button
                      type="button"
                      onClick={() => handleSaveCustomOrigin('')}
                      className="px-2.5 py-1 text-xs text-slate-400 hover:text-white bg-slate-800 rounded-lg"
                    >
                      Ripristina
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-slate-400">
                  Lascia vuoto per usare l&apos;indirizzo attuale della finestra corrente.
                </p>
              </div>
            )}
          </div>

          <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 hover:text-white transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>{t.printSheet || 'Stampa foglio per bacheca'}</span>
            </button>
            <a
              href={roomUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              <span>{t.openAsAttendee || 'Apri come partecipante'}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
