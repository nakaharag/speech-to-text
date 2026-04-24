import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PdfUpload } from './PdfUpload';
import { VoiceSelector } from './VoiceSelector';
import { AudioPlayer } from './AudioPlayer';
import { convertPdfToAudio, getPdfDownloadUrl } from '../utils/api';

export function PdfToAudioPage() {
  const { t } = useTranslation();
  const [voice, setVoice] = useState('alloy');
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [remaining, setRemaining] = useState(null);
  const [fileName, setFileName] = useState(null);

  const handleFileSelect = async (file) => {
    setError(null);
    setResult(null);
    setIsConverting(true);
    setFileName(file.name);

    try {
      const response = await convertPdfToAudio(file, voice);
      setResult(response);
      setRemaining(response.remaining);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsConverting(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
    setFileName(null);
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="pdf-to-audio-page">
      <div className="page-header">
        <h1>{t('pdfToAudio.title', 'PDF to Audio')}</h1>
        <p className="page-subtitle">
          {t('pdfToAudio.subtitle', 'Convert your PDF documents to audio files')}
        </p>
      </div>

      {!result && (
        <>
          <div className="pdf-options">
            <VoiceSelector
              value={voice}
              onChange={setVoice}
              disabled={isConverting}
            />
          </div>

          <PdfUpload
            onFileSelect={handleFileSelect}
            disabled={isConverting}
          />

          {isConverting && (
            <div className="conversion-progress">
              <div className="progress-spinner" />
              <span className="progress-text">
                {t('pdfToAudio.converting', 'Converting PDF to audio...')}
              </span>
              <span className="progress-subtext">
                {t('pdfToAudio.pleaseWait', 'This may take a moment for longer documents')}
              </span>
            </div>
          )}
        </>
      )}

      {error && (
        <div className="error-message">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="conversion-result">
          <div className="result-header">
            <h2>{t('pdfToAudio.success', 'Conversion Complete')}</h2>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleReset}
            >
              {t('pdfToAudio.convertAnother', 'Convert Another')}
            </button>
          </div>

          <div className="result-stats">
            <div className="stat">
              <span className="stat-label">{t('pdfToAudio.pages', 'Pages')}</span>
              <span className="stat-value">{result.pageCount}</span>
            </div>
            <div className="stat">
              <span className="stat-label">{t('pdfToAudio.characters', 'Characters')}</span>
              <span className="stat-value">{result.textLength?.toLocaleString()}</span>
            </div>
            <div className="stat">
              <span className="stat-label">{t('pdfToAudio.duration', 'Duration')}</span>
              <span className="stat-value">{formatDuration(result.estimatedDuration)}</span>
            </div>
            <div className="stat">
              <span className="stat-label">{t('pdfToAudio.size', 'Size')}</span>
              <span className="stat-value">{formatSize(result.audioSize)}</span>
            </div>
          </div>

          <AudioPlayer
            audioBase64={result.audio}
            fileName={fileName}
            downloadUrl={getPdfDownloadUrl(result.jobId)}
          />
        </div>
      )}

      {remaining !== null && (
        <div className="rate-limit-info">
          {t('pdfToAudio.remaining', '{{count}} conversions remaining today', { count: remaining })}
        </div>
      )}

      <div className="pdf-features">
        <h3>{t('pdfToAudio.features', 'Features')}</h3>
        <ul>
          <li>{t('pdfToAudio.feature1', 'Supports text-based PDF documents')}</li>
          <li>{t('pdfToAudio.feature2', '6 different voice options')}</li>
          <li>{t('pdfToAudio.feature3', 'Instant MP3 download')}</li>
          <li>{t('pdfToAudio.feature4', 'Up to 20 pages per document')}</li>
        </ul>
      </div>
    </div>
  );
}

export default PdfToAudioPage;
