import React, { useState, useEffect } from 'react';
import { Recorder } from './components/Recorder';
import { Transcript } from './components/Transcript';
import { Summary } from './components/Summary';
import { SharePanel } from './components/SharePanel';
import { AdBanner } from './components/AdBanner';
import { transcribeAudio, summarizeText, getShare } from './utils/api';

function App() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const [transcript, setTranscript] = useState('');
  const [correctedTranscript, setCorrectedTranscript] = useState('');
  const [summary, setSummary] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [error, setError] = useState('');
  const [remaining, setRemaining] = useState(null);
  const [isSharedView, setIsSharedView] = useState(false);

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

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
      setSummary(share.summary);
      setIsSharedView(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsTranscribing(false);
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
      const result = await transcribeAudio(audioBlob);
      setTranscript(result.transcription);
      if (result.remaining !== undefined) {
        setRemaining(result.remaining);
      }

      // Step 2: Summarize
      setIsTranscribing(false);
      setIsSummarizing(true);
      try {
        const summaryResult = await summarizeText(result.transcription);
        setCorrectedTranscript(summaryResult.correctedTranscript);
        setSummary(summaryResult.summary);
      } catch (summaryErr) {
        console.error('Summary error:', summaryErr);
        // Summarization is optional, don't show error
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsTranscribing(false);
      setIsSummarizing(false);
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
    window.history.pushState({}, '', '/');
  };

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
            <button className="theme-toggle" onClick={toggleTheme}>
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
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
                {error}
              </div>
            )}

            {/* Shared View Notice */}
            {isSharedView && (
              <div className="message success">
                You're viewing shared content.{' '}
                <button
                  onClick={handleNewRecording}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'inherit',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    padding: 0,
                    font: 'inherit'
                  }}
                >
                  Start a new recording
                </button>
              </div>
            )}

            {/* Recorder */}
            {!isSharedView && (
              <Recorder
                onRecordingComplete={handleRecordingComplete}
                isProcessing={isProcessing}
              />
            )}

            {/* Rate Limit Info */}
            {remaining !== null && !isSharedView && (
              <div className="rate-limit">
                {remaining} transcription{remaining !== 1 ? 's' : ''} remaining today
              </div>
            )}

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
              />
            )}
          </main>

          {/* Bottom Leaderboard Ad */}
          <div className="leaderboard-ad bottom">
            <AdBanner slot="0987654321" format="horizontal" />
          </div>

          {/* Footer */}
          <footer style={{
            textAlign: 'center',
            padding: 'var(--spacing-lg)',
            color: 'var(--color-text-muted)',
            fontSize: '0.75rem'
          }}>
            <p>Max 15 seconds per recording. 5 free transcriptions per day.</p>
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
