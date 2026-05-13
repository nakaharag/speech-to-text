'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface SummaryProps {
  text: string;
  correctedTranscript: string | null;
  isLoading: boolean;
}

export function Summary({ text, correctedTranscript, isLoading }: SummaryProps) {
  const t = useTranslations('transcribe.summary');
  const [showCorrected, setShowCorrected] = useState(false);

  if (!text && !isLoading) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
        <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          {t('title')}
        </span>
      </div>
      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center gap-3 text-slate-500">
            <div className="w-5 h-5 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
            <span className="text-sm">{t('generating')}</span>
          </div>
        ) : (
          <p className="text-slate-700 leading-relaxed">{text}</p>
        )}
      </div>
      {correctedTranscript && !isLoading && (
        <div className="border-t border-slate-100">
          <button
            type="button"
            className="flex items-center gap-2 w-full px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            onClick={() => setShowCorrected(!showCorrected)}
          >
            <svg
              className={`w-4 h-4 transition-transform ${showCorrected ? 'rotate-90' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
            {t('viewCorrected')}
          </button>
          {showCorrected && (
            <div className="px-4 pb-4">
              <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-600 leading-relaxed">
                {correctedTranscript}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
