/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { SubtitleSegment, UILanguage } from '../../types';
import { X, Download, Copy, Check, FileText } from 'lucide-react';
import { UI_TRANSLATIONS } from '../../i18n/translations';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  segments: SubtitleSegment[];
  roomName: string;
  uiLang: UILanguage;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  segments,
  roomName,
  uiLang,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<'txt' | 'srt' | 'vtt' | 'md'>('txt');
  const [copied, setCopied] = useState(false);
  const t = UI_TRANSLATIONS[uiLang] || UI_TRANSLATIONS.it;

  if (!isOpen) return null;

  const generateTxt = (): string => {
    return segments
      .map(s => {
        const time = new Date(s.timestamp).toLocaleTimeString();
        const bib = s.scriptureCitation ? ` [${s.scriptureCitation}]` : '';
        return `[${time}]${bib} ${s.text}`;
      })
      .join('\n\n');
  };

  const generateSrt = (): string => {
    return segments
      .map((s, index) => {
        const startSec = Math.max(0, (s.timestamp - (segments[0]?.timestamp || s.timestamp)) / 1000);
        const endSec = startSec + 4.0;

        const formatTime = (totalSec: number) => {
          const hrs = Math.floor(totalSec / 3600).toString().padStart(2, '0');
          const mins = Math.floor((totalSec % 3600) / 60).toString().padStart(2, '0');
          const secs = Math.floor(totalSec % 60).toString().padStart(2, '0');
          const ms = Math.floor((totalSec % 1) * 1000).toString().padStart(3, '0');
          return `${hrs}:${mins}:${secs},${ms}`;
        };

        return `${index + 1}\n${formatTime(startSec)} --> ${formatTime(endSec)}\n${s.text}\n`;
      })
      .join('\n');
  };

  const generateVtt = (): string => {
    return `WEBVTT - Milingua - Live Translator: ${roomName}\n\n` +
      segments
        .map((s, index) => {
          const startSec = Math.max(0, (s.timestamp - (segments[0]?.timestamp || s.timestamp)) / 1000);
          const endSec = startSec + 4.0;
          const formatTime = (totalSec: number) => {
            const hrs = Math.floor(totalSec / 3600).toString().padStart(2, '0');
            const mins = Math.floor((totalSec % 3600) / 60).toString().padStart(2, '0');
            const secs = Math.floor(totalSec % 60).toString().padStart(2, '0');
            const ms = Math.floor((totalSec % 1) * 1000).toString().padStart(3, '0');
            return `${hrs}:${mins}:${secs}.${ms}`;
          };
          return `${index + 1}\n${formatTime(startSec)} --> ${formatTime(endSec)}\n${s.text}\n`;
        })
        .join('\n');
  };

  const generateMarkdown = (): string => {
    let md = `# ${t.exportTranscript}: ${roomName}\nDate: ${new Date().toLocaleDateString()}\n\n---\n\n`;
    segments.forEach(s => {
      const time = new Date(s.timestamp).toLocaleTimeString();
      const bib = s.scriptureCitation ? ` > 📖 **${s.scriptureCitation}**\n` : '';
      md += `${bib}*(${time})* ${s.text}\n\n`;
    });
    return md;
  };

  const getContent = () => {
    switch (selectedFormat) {
      case 'srt': return generateSrt();
      case 'vtt': return generateVtt();
      case 'md': return generateMarkdown();
      case 'txt':
      default: return generateTxt();
    }
  };

  const content = getContent();

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${roomName.toLowerCase().replace(/\s+/g, '_')}_transcript.${selectedFormat}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-bold text-white">{t.exportTranscript}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Format Selector */}
        <div className="flex items-center gap-2 py-4">
          {(['txt', 'srt', 'vtt', 'md'] as const).map(fmt => (
            <button
              key={fmt}
              onClick={() => setSelectedFormat(fmt)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg uppercase tracking-wide transition-colors ${
                selectedFormat === fmt
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              .{fmt}
            </button>
          ))}
          <span className="text-xs text-slate-400 ml-auto font-mono">
            {segments.length} {t.recordedSegments}
          </span>
        </div>

        {/* Preview Area */}
        <div className="flex-1 min-h-[220px] overflow-y-auto bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 select-all whitespace-pre-wrap">
          {content || t.noTextYet}
        </div>

        {/* Action buttons */}
        <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-end gap-3">
          <button
            onClick={handleCopy}
            className="px-4 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-1.5 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? t.copied : t.copyAll}</span>
          </button>

          <button
            onClick={handleDownload}
            disabled={segments.length === 0}
            className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg flex items-center gap-1.5 transition-colors shadow-md shadow-indigo-600/30"
          >
            <Download className="w-4 h-4" />
            <span>{t.downloadFile} (.{selectedFormat})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
