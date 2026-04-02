import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

export function Transcript({ text, isLoading }) {
  const { t } = useTranslation();
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
    <div className="result-block">
      <div className="result-block-header">
        <span className="result-block-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          {t('transcript.title')}
        </span>
        {text && (
          <button className="btn-icon" onClick={copyToClipboard} title={t('transcript.copy')}>
            {copied ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            )}
          </button>
        )}
      </div>
      <div className={`result-block-content ${isLoading ? 'loading' : ''}`}>
        {isLoading ? (
          <div className="loading-state">
            <div className="spinner" />
            <span>{t('transcript.transcribing')}</span>
          </div>
        ) : (
          <p className="transcript-text">{text}</p>
        )}
      </div>
    </div>
  );
}

export default Transcript;
