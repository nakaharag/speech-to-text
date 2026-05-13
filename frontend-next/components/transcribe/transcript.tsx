'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface TranscriptProps {
  text: string;
  isLoading: boolean;
}

export function Transcript({ text, isLoading }: TranscriptProps) {
  const t = useTranslations('transcribe.transcript');
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  if (!text && !isLoading) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
        <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          {t('title')}
        </span>
        {text && (
          <button
            type="button"
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            onClick={copyToClipboard}
            title={t('copy')}
          >
            {copied ? (
              <svg className="w-4 h-4 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            )}
          </button>
        )}
      </div>
      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center gap-3 text-slate-500">
            <div className="w-5 h-5 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
            <span className="text-sm">{t('transcribing')}</span>
          </div>
        ) : (
          <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{text}</p>
        )}
      </div>
    </div>
  );
}
