'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { PdfUpload } from '@/components/pdf/pdf-upload';
import { VoiceSelector } from '@/components/pdf/voice-selector';
import { AudioPlayer } from '@/components/pdf/audio-player';
import { Progress } from '@/components/ui/progress';

interface ConversionResult {
  audio: string;
  jobId: string;
  pageCount: number;
  textLength: number;
  estimatedDuration: number;
  audioSize: number;
}

export default function PdfToAudioPage() {
  const t = useTranslations('pdfToAudio');
  const [voice, setVoice] = useState('alloy');
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [conversionStatus, setConversionStatus] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const pollForCompletion = async (jobId: string): Promise<ConversionResult> => {
    const maxAttempts = 60; // 5 minutes max (5s intervals)
    let attempts = 0;

    while (attempts < maxAttempts) {
      const response = await fetch(`/api/proxy/pdf/status/${jobId}`);
      if (!response.ok) throw new Error('Failed to check status');

      const status = await response.json();
      setConversionStatus(status.status);

      if (status.status === 'extracting') {
        setProgress(25);
      } else if (status.status === 'converting') {
        setProgress(50 + (status.progress || 0) * 0.4);
      }

      if (status.status === 'completed') {
        setProgress(100);
        return status;
      }

      if (status.status === 'failed') {
        throw new Error(status.error || 'Conversion failed');
      }

      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;
    }

    throw new Error('Conversion timed out');
  };

  const handleFileSelect = async (file: File) => {
    setError(null);
    setResult(null);
    setIsConverting(true);
    setFileName(file.name);
    setConversionStatus('pending');
    setProgress(0);

    try {
      // Start conversion
      const formData = new FormData();
      formData.append('file', file);
      formData.append('voice', voice);

      const startResponse = await fetch('/api/proxy/pdf/convert', {
        method: 'POST',
        body: formData,
      });

      if (!startResponse.ok) {
        const errorData = await startResponse.json();
        throw new Error(errorData.error || 'Failed to start conversion');
      }

      const startData = await startResponse.json();
      setRemaining(startData.remaining);
      setProgress(10);

      // Poll for completion
      const finalResult = await pollForCompletion(startData.jobId);
      setResult(finalResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsConverting(false);
      setConversionStatus(null);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
    setFileName(null);
    setProgress(0);
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      {/* Page Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">{t('title')}</h1>
        <p className="text-slate-600">{t('subtitle')}</p>
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

      {!result && (
        <div className="space-y-6">
          {/* Voice Selector */}
          <div className="flex justify-center">
            <VoiceSelector
              value={voice}
              onChange={setVoice}
              disabled={isConverting}
            />
          </div>

          {/* PDF Upload */}
          <PdfUpload
            onFileSelect={handleFileSelect}
            disabled={isConverting}
          />

          {/* Conversion Progress */}
          {isConverting && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex flex-col items-center space-y-4">
                <div className="w-10 h-10 border-3 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
                <div className="text-center">
                  <p className="font-medium text-slate-900">
                    {conversionStatus === 'extracting' && t('status.extracting')}
                    {conversionStatus === 'converting' && t('status.converting')}
                    {(conversionStatus === 'pending' || !conversionStatus) && t('status.starting')}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    {conversionStatus === 'extracting'
                      ? t('status.ocrNote')
                      : t('status.pleaseWait')}
                  </p>
                </div>
                <div className="w-full max-w-xs">
                  <Progress value={progress} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-6">
          {/* Result Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">{t('success')}</h2>
            <button
              type="button"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              onClick={handleReset}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
              {t('convertAnother')}
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-slate-200 p-4 text-center">
              <p className="text-sm text-slate-500">{t('stats.pages')}</p>
              <p className="text-2xl font-bold text-slate-900">{result.pageCount}</p>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-4 text-center">
              <p className="text-sm text-slate-500">{t('stats.characters')}</p>
              <p className="text-2xl font-bold text-slate-900">{result.textLength?.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-4 text-center">
              <p className="text-sm text-slate-500">{t('stats.duration')}</p>
              <p className="text-2xl font-bold text-slate-900">{formatDuration(result.estimatedDuration)}</p>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-4 text-center">
              <p className="text-sm text-slate-500">{t('stats.size')}</p>
              <p className="text-2xl font-bold text-slate-900">{formatSize(result.audioSize)}</p>
            </div>
          </div>

          {/* Audio Player */}
          <AudioPlayer
            audioBase64={result.audio}
            fileName={fileName}
            downloadUrl={`/api/proxy/pdf/download/${result.jobId}`}
          />
        </div>
      )}

      {/* Rate Limit Info */}
      {remaining !== null && (
        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-600">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span>{t('remaining', { count: remaining })}</span>
        </div>
      )}

      {/* Features Section */}
      <div className="mt-12 bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">{t('features.title')}</h3>
        <ul className="space-y-3">
          <li className="flex items-start gap-3">
            <svg className="w-5 h-5 text-green-500 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span className="text-slate-600">{t('features.feature1')}</span>
          </li>
          <li className="flex items-start gap-3">
            <svg className="w-5 h-5 text-green-500 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span className="text-slate-600">{t('features.feature2')}</span>
          </li>
          <li className="flex items-start gap-3">
            <svg className="w-5 h-5 text-green-500 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span className="text-slate-600">{t('features.feature3')}</span>
          </li>
          <li className="flex items-start gap-3">
            <svg className="w-5 h-5 text-green-500 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span className="text-slate-600">{t('features.feature4')}</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
