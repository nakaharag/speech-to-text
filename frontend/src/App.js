import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Recorder } from './components/Recorder';
import { Transcript } from './components/Transcript';
import { Summary } from './components/Summary';
import { SharePanel } from './components/SharePanel';
import { AdBanner } from './components/AdBanner';
import { LanguageSelector } from './components/LanguageSelector';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { FileUpload } from './components/FileUpload';
import { transcribeAudio, uploadAudioFile, summarizeText, getShare } from './utils/api';

function App() {
  const { t } = useTranslation();

  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

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

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

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

  // Check for shared content
  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/^\/s\/([a-zA-Z0-9_-]+)$/);
    if (match) {
      const shareId = match[1];
      loadSharedContent(shareId);
    }
  }, []);

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
    // Step 2: Summarize
    setIsTranscribing(false);
    setIsSummarizing(true);
    try {
      const summaryResult = await summarizeText(transcriptionText);
      setCorrectedTranscript(summaryResult.correctedTranscript);
      setSummary(summaryResult.summary);
    } catch (summaryErr) {
      console.error('Summary error:', summaryErr);
      // Summarization is optional, don't show error
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleRecordingComplete = async (audioBlob) => {
    setError('');
    setTranscript('');
    setCorrectedTranscript('');
    setSummary('');

    // Step 1: Transcribe
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

    // Step 1: Upload and transcribe
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

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleNewRecording = () => {
    setIsSharedView(false);
    setTranscript('');
    setCorrectedTranscript('');
    setSummary('');
    setError('');
    setShowUploadMode(false);
    window.history.pushState({}, '', '/');
  };

  const handleFileSelect = async (file) => {
    setShowUploadMode(false);
    await handleFileUpload(file);
  };

  // Check if we have results to show
  const hasResults = transcript || correctedTranscript || summary || isTranscribing || isSummarizing;

  const isProcessing = isTranscribing || isSummarizing;

  return (
    <div className="app">
      <div className="app-wrapper">
        {/* Left Side Ad */}
        <aside className="side-ad">
          <AdBanner slot="1111111111" format="vertical" />
        </aside>

        <div className="container">
          {/* Header */}
          <header className="header">
            <a href="/" className="logo" onClick={(e) => { e.preventDefault(); handleNewRecording(); }}>
              <svg className="logo-icon" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <rect x="2" y="8" width="2" height="8" rx="1" />
                <rect x="6" y="5" width="2" height="14" rx="1" />
                <rect x="10" y="3" width="2" height="18" rx="1" />
                <rect x="14" y="6" width="2" height="12" rx="1" />
                <rect x="18" y="9" width="2" height="6" rx="1" />
                <rect x="22" y="7" width="2" height="10" rx="1" />
              </svg>
              speech-to-text.me
            </a>
            <div className="header-controls">
              <LanguageSwitcher />
              <button className="theme-toggle" onClick={toggleTheme} title={theme === 'light' ? t('header.darkMode') : t('header.lightMode')}>
                {theme === 'light' ? '🌙' : '☀️'}
              </button>
            </div>
          </header>

          {/* Top Leaderboard Ad */}
          <div className="leaderboard-ad">
            <AdBanner slot="1234567890" format="horizontal" />
          </div>

          {/* Main Content */}
          <main className="main">
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
            <section className="main-section">
              {/* Show Results View when we have transcript/summary */}
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
          </main>

          {/* Bottom Leaderboard Ad */}
          <div className="leaderboard-ad bottom">
            <AdBanner slot="0987654321" format="horizontal" />
          </div>

          {/* Footer */}
          <footer className="footer">
            <p>{t('app.footer')}</p>
          </footer>
        </div>

        {/* Right Side Ad */}
        <aside className="side-ad">
          <AdBanner slot="2222222222" format="vertical" />
        </aside>
      </div>
    </div>
  );
}

export default App;
