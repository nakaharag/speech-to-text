import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

export function Summary({ text, correctedTranscript, isLoading }) {
  const { t } = useTranslation();
  const [showCorrected, setShowCorrected] = useState(false);

  if (!text && !isLoading) {
    return null;
  }

  return (
    <div className="result-block">
      <div className="result-block-header">
        <span className="result-block-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          {t('summary.title')}
        </span>
      </div>
      <div className={`result-block-content ${isLoading ? 'loading' : ''}`}>
        {isLoading ? (
          <div className="loading-state">
            <div className="spinner" />
            <span>{t('summary.generating')}</span>
          </div>
        ) : (
          <p className="summary-text">{text}</p>
        )}
      </div>
      {correctedTranscript && !isLoading && (
        <div className="corrected-transcript-toggle">
          <button
            className="toggle-btn"
            onClick={() => setShowCorrected(!showCorrected)}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ transform: showCorrected ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
            {t('summary.viewCorrected')}
          </button>
          {showCorrected && (
            <div className="corrected-transcript-content">
              {correctedTranscript}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Summary;
