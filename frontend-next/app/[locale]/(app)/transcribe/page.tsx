'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { AudioRecorder } from '@/components/transcribe/audio-recorder';
import { FileUpload } from '@/components/transcribe/file-upload';
import { LanguageSelector } from '@/components/transcribe/language-selector';
import { Transcript } from '@/components/transcribe/transcript';
import { Summary } from '@/components/transcribe/summary';
import { SharePanel } from '@/components/transcribe/share-panel';

export default function TranscribePage() {
  const t = useTranslations('transcribe');
  const searchParams = useSearchParams();
  const sharedId = searchParams.get('share');

  const [transcript, setTranscript] = useState('');
  const [correctedTranscript, setCorrectedTranscript] = useState('');
  const [summary, setSummary] = useState('');
  const [language, setLanguage] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [error, setError] = useState('');
  const [remaining, setRemaining] = useState<number | null>(null);
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

  const loadSharedContent = async (id: string) => {
    try {
      setIsTranscribing(true);
      const response = await fetch(`/api/proxy/share/${id}`);
      if (!response.ok) throw new Error('Failed to load shared content');
      const share = await response.json();
      setTranscript(share.transcript);
      setCorrectedTranscript(share.corrected || '');
      setSummary(share.summary || '');
      if (share.language) {
        setLanguage(share.language);
      }
      setIsSharedView(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsTranscribing(false);
    }
  };

  const processTranscription = async (transcriptionText: string) => {
    setIsTranscribing(false);
    setIsSummarizing(true);
    try {
      const response = await fetch('/api/proxy/speech/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: transcriptionText }),
      });
      if (!response.ok) throw new Error('Failed to summarize');
      const result = await response.json();
      setCorrectedTranscript(result.correctedTranscript);
      setSummary(result.summary);
    } catch (summaryErr) {
      console.error('Summary error:', summaryErr);
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleRecordingComplete = async (audioBlob: Blob) => {
    setError('');
    setTranscript('');
    setCorrectedTranscript('');
    setSummary('');

    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      if (language) {
        formData.append('language', language);
      }

      const response = await fetch('/api/proxy/speech/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Transcription failed');
      }

      const result = await response.json();
      setTranscript(result.transcription);
      if (result.remaining !== undefined) {
        setRemaining(result.remaining);
      }
      await processTranscription(result.transcription);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsTranscribing(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    setError('');
    setTranscript('');
    setCorrectedTranscript('');
    setSummary('');

    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('audio', file);
      if (language) {
        formData.append('language', language);
      }

      const response = await fetch('/api/proxy/speech/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Transcription failed');
      }

      const result = await response.json();
      setTranscript(result.transcription);
      if (result.remaining !== undefined) {
        setRemaining(result.remaining);
      }
      await processTranscription(result.transcription);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
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
    window.history.pushState({}, '', window.location.pathname);
  };

  const handleFileSelect = async (file: File) => {
    setShowUploadMode(false);
    await handleFileUpload(file);
  };

  const hasResults = transcript || correctedTranscript || summary || isTranscribing || isSummarizing;
  const isProcessing = isTranscribing || isSummarizing;

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      {/* Page Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">{t('pageTitle')}</h1>
        <p className="text-slate-600">{t('pageSubtitle')}</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
          <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Main Section */}
      <div className="space-y-6">
        {hasResults ? (
          <div className="space-y-6">
            {/* Results Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">{t('results.title')}</h2>
              <button
                type="button"
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                onClick={handleNewRecording}
                disabled={isProcessing}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
              <div className="flex items-center gap-2 p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 text-sm">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <LanguageSelector
                value={language}
                onChange={setLanguage}
                disabled={isProcessing}
              />
              <button
                type="button"
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  showUploadMode
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
                onClick={() => setShowUploadMode(!showUploadMode)}
                disabled={isProcessing}
              >
                {showUploadMode ? (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                )}
                {showUploadMode ? t('input.recordInstead') : t('input.uploadFile')}
              </button>
            </div>

            {/* Content Area */}
            <div className="p-6">
              {showUploadMode ? (
                <FileUpload
                  onFileSelect={handleFileSelect}
                  disabled={isProcessing}
                />
              ) : (
                <AudioRecorder
                  onRecordingComplete={handleRecordingComplete}
                  isProcessing={isProcessing}
                />
              )}
            </div>

            {/* Rate Limit Info */}
            {remaining !== null && (
              <div className="flex items-center justify-center gap-2 p-3 border-t border-slate-100 bg-slate-50 text-sm text-slate-600">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>{t('rateLimit.remaining', { count: remaining })}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
