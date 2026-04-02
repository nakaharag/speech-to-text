import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Recorder } from './Recorder';
import { Transcript } from './Transcript';
import { Summary } from './Summary';
import { SharePanel } from './SharePanel';
import { LanguageSelector } from './LanguageSelector';
import { FileUpload } from './FileUpload';
import { transcribeAudio, uploadAudioFile, summarizeText, getShare } from '../utils/api';

export function TranscribePage({ sharedId }) {
  const { t } = useTranslation();

  const [transcript, setTranscript] = useState('');
  const [correctedTranscript, setCorrectedTranscript] = useState('');
  const [summary, setSummary] = useState('');
  const [language, setLanguage] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [error, setError] = useState('');
  const [remaining, setRemaining] = useState(null);
  const [isSharedView, setIsSharedView] = useState(false);
  const [showUploadMode, setShowUploadMode] = useState(false);

  // Load saved language preference
  useEffect(() => {
    const savedLanguage = localStorage.getItem('preferredLanguage');
    if (savedLanguage) {
      setLanguage(savedLanguage);
    }
  }, []);

  // Save language preference
  useEffect(() => {
    if (language) {
      localStorage.setItem('preferredLanguage', language);
    } else {
      localStorage.removeItem('preferredLanguage');
    }
  }, [language]);

  // Load shared content if sharedId is provided
  useEffect(() => {
    if (sharedId) {
      loadSharedContent(sharedId);
    }
  }, [sharedId]);

  const loadSharedContent = async (id) => {
    try {
      setIsTranscribing(true);
      const share = await getShare(id);
      setTranscript(share.transcript);
      setCorrectedTranscript(share.corrected || '');
      setSummary(share.summary || '');
      if (share.language) {
        setLanguage(share.language);
      }
      setIsSharedView(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsTranscribing(false);
    }
  };

  const processTranscription = async (transcriptionText) => {
    setIsTranscribing(false);
    setIsSummarizing(true);
    try {
      const summaryResult = await summarizeText(transcriptionText);
      setCorrectedTranscript(summaryResult.correctedTranscript);
      setSummary(summaryResult.summary);
    } catch (summaryErr) {
      console.error('Summary error:', summaryErr);
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleRecordingComplete = async (audioBlob) => {
    setError('');
    setTranscript('');
    setCorrectedTranscript('');
    setSummary('');

    setIsTranscribing(true);
    try {
      const result = await transcribeAudio(audioBlob, language || null);
      setTranscript(result.transcription);
      if (result.remaining !== undefined) {
        setRemaining(result.remaining);
      }
      await processTranscription(result.transcription);
    } catch (err) {
      setError(err.message);
      setIsTranscribing(false);
    }
  };

  const handleFileUpload = async (file) => {
    setError('');
    setTranscript('');
    setCorrectedTranscript('');
    setSummary('');

    setIsTranscribing(true);
    try {
      const result = await uploadAudioFile(file, language || null);
      setTranscript(result.transcription);
      if (result.remaining !== undefined) {
        setRemaining(result.remaining);
      }
      await processTranscription(result.transcription);
    } catch (err) {
      setError(err.message);
      setIsTranscribing(false);
    }
  };

  const handleNewRecording = () => {
    setIsSharedView(false);
    setTranscript('');
    setCorrectedTranscript('');
    setSummary('');
    setError('');
    setShowUploadMode(false);
    window.history.pushState({}, '', '/app');
  };

  const handleFileSelect = async (file) => {
    setShowUploadMode(false);
    await handleFileUpload(file);
  };

  const hasResults = transcript || correctedTranscript || summary || isTranscribing || isSummarizing;
  const isProcessing = isTranscribing || isSummarizing;

  return (
    <div className="transcribe-page">
      {/* Page Header */}
      <div className="page-header">
        <h1>{t('transcribe.pageTitle')}</h1>
        <p>{t('transcribe.pageSubtitle')}</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="message error">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Main Section - Either Input or Results */}
      <section className="tool-section">
        {hasResults ? (
          <div className="results-view">
            {/* Results Header */}
            <div className="results-header">
              <h2>{t('results.title')}</h2>
              <button
                className="btn btn-secondary"
                onClick={handleNewRecording}
                disabled={isProcessing}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                  <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                </svg>
                {t('results.newRecording')}
              </button>
            </div>

            {/* Transcript */}
            <Transcript
              text={correctedTranscript || transcript}
              isLoading={isTranscribing}
            />

            {/* Summary */}
            <Summary
              text={summary}
              correctedTranscript={correctedTranscript !== transcript ? correctedTranscript : null}
              isLoading={isSummarizing}
            />

            {/* Share Panel */}
            {!isSharedView && (
              <SharePanel
                transcript={correctedTranscript || transcript}
                summary={summary}
                corrected={correctedTranscript}
                language={language}
              />
            )}

            {/* Shared View Notice */}
            {isSharedView && (
              <div className="shared-notice">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                {t('sharedView.notice')}
              </div>
            )}
          </div>
        ) : (
          /* Input View - Recording or Upload */
          <div className="input-view">
            {/* Toolbar: Language Selector + Upload Button */}
            <div className="input-toolbar">
              <LanguageSelector
                value={language}
                onChange={setLanguage}
                disabled={isProcessing}
              />
              <button
                className={`btn btn-outline ${showUploadMode ? 'active' : ''}`}
                onClick={() => setShowUploadMode(!showUploadMode)}
                disabled={isProcessing}
              >
                {showUploadMode ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                )}
                {showUploadMode ? t('input.recordInstead') : t('input.uploadFile')}
              </button>
            </div>

            {/* Content Area: Either Recorder or FileUpload */}
            <div className="input-content">
              {showUploadMode ? (
                <FileUpload
                  onFileSelect={handleFileSelect}
                  disabled={isProcessing}
                />
              ) : (
                <Recorder
                  onRecordingComplete={handleRecordingComplete}
                  isProcessing={isProcessing}
                />
              )}
            </div>

            {/* Rate Limit Info */}
            {remaining !== null && (
              <div className="rate-limit-info">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>{t('rateLimit.remaining', { count: remaining })}</span>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default TranscribePage;
