# Phase 3B: Core Features Migration

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the core transcription and PDF-to-audio pages from React to Next.js, maintaining feature parity.

**Architecture:** Client components for audio recording (browser APIs), server actions for API calls.

**Tech Stack:** Next.js 16, MediaRecorder API, Web Audio API

**Prerequisites:** Phase 3A complete (API proxy, i18n working)

---

## Overview

The React frontend has these key components to migrate:
- `TranscribePage.js` - Main transcription page with recording and upload
- `Recorder.js` - Audio recording with visualization
- `FileUpload.js` - Drag-and-drop file upload
- `Transcript.js` - Display transcription results
- `Summary.js` - Display AI summary
- `LanguageSelector.js` - Language selection dropdown
- `PdfToAudioPage.js` - PDF to audio conversion
- `PdfUpload.js` - PDF file upload
- `VoiceSelector.js` - TTS voice selection
- `AudioPlayer.js` - Audio playback controls

---

## Task 1: Create Audio Recorder Component

**Files:**
- Create: `frontend-next/components/transcribe/recorder.tsx`
- Create: `frontend-next/hooks/use-audio-recorder.ts`

- [ ] **Step 1: Create audio recorder hook**

```typescript
// frontend-next/hooks/use-audio-recorder.ts
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface AudioRecorderState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  audioBlob: Blob | null;
  audioUrl: string | null;
  error: string | null;
}

export function useAudioRecorder() {
  const [state, setState] = useState<AudioRecorderState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    audioBlob: null,
    audioUrl: null,
    error: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setState((prev) => ({
          ...prev,
          audioBlob: blob,
          audioUrl: url,
          isRecording: false,
          isPaused: false,
        }));

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(1000); // Collect data every second
      startTimeRef.current = Date.now();

      // Start duration timer
      timerRef.current = setInterval(() => {
        setState((prev) => ({
          ...prev,
          duration: Math.floor((Date.now() - startTimeRef.current) / 1000),
        }));
      }, 1000);

      setState((prev) => ({
        ...prev,
        isRecording: true,
        isPaused: false,
        duration: 0,
        audioBlob: null,
        audioUrl: null,
        error: null,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: 'Microphone access denied. Please allow microphone access to record.',
      }));
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording) {
      mediaRecorderRef.current.stop();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  }, [state.isRecording]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording && !state.isPaused) {
      mediaRecorderRef.current.pause();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      setState((prev) => ({ ...prev, isPaused: true }));
    }
  }, [state.isRecording, state.isPaused]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isPaused) {
      mediaRecorderRef.current.resume();
      timerRef.current = setInterval(() => {
        setState((prev) => ({
          ...prev,
          duration: prev.duration + 1,
        }));
      }, 1000);
      setState((prev) => ({ ...prev, isPaused: false }));
    }
  }, [state.isPaused]);

  const resetRecording = useCallback(() => {
    if (state.audioUrl) {
      URL.revokeObjectURL(state.audioUrl);
    }
    setState({
      isRecording: false,
      isPaused: false,
      duration: 0,
      audioBlob: null,
      audioUrl: null,
      error: null,
    });
  }, [state.audioUrl]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (state.audioUrl) {
        URL.revokeObjectURL(state.audioUrl);
      }
    };
  }, [state.audioUrl]);

  return {
    ...state,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
  };
}
```

- [ ] **Step 2: Create recorder component**

```typescript
// frontend-next/components/transcribe/recorder.tsx
'use client';

import { useAudioRecorder } from '@/hooks/use-audio-recorder';
import { Button } from '@/components/ui/button';

interface RecorderProps {
  onRecordingComplete: (blob: Blob) => void;
  disabled?: boolean;
}

export function Recorder({ onRecordingComplete, disabled }: RecorderProps) {
  const {
    isRecording,
    isPaused,
    duration,
    audioBlob,
    audioUrl,
    error,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
  } = useAudioRecorder();

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleUseRecording = () => {
    if (audioBlob) {
      onRecordingComplete(audioBlob);
    }
  };

  if (error) {
    return (
      <div className="text-center p-6 bg-red-50 rounded-xl">
        <p className="text-red-600">{error}</p>
        <Button
          variant="outline"
          onClick={() => window.location.reload()}
          className="mt-4"
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-6 p-6 bg-slate-50 rounded-xl">
      {/* Duration Display */}
      <div className="text-4xl font-mono text-slate-900">
        {formatDuration(duration)}
      </div>

      {/* Recording Indicator */}
      {isRecording && !isPaused && (
        <div className="flex items-center gap-2 text-red-500">
          <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          Recording...
        </div>
      )}
      {isPaused && (
        <div className="text-slate-500">Paused</div>
      )}

      {/* Controls */}
      <div className="flex gap-3">
        {!isRecording && !audioBlob && (
          <Button
            onClick={startRecording}
            disabled={disabled}
            size="lg"
            className="bg-red-500 hover:bg-red-600"
          >
            <MicIcon className="w-5 h-5 mr-2" />
            Start Recording
          </Button>
        )}

        {isRecording && (
          <>
            {!isPaused ? (
              <Button onClick={pauseRecording} variant="outline" size="lg">
                <PauseIcon className="w-5 h-5 mr-2" />
                Pause
              </Button>
            ) : (
              <Button onClick={resumeRecording} variant="outline" size="lg">
                <PlayIcon className="w-5 h-5 mr-2" />
                Resume
              </Button>
            )}
            <Button onClick={stopRecording} size="lg">
              <StopIcon className="w-5 h-5 mr-2" />
              Stop
            </Button>
          </>
        )}

        {audioBlob && (
          <>
            <Button onClick={handleUseRecording} size="lg">
              Use Recording
            </Button>
            <Button onClick={resetRecording} variant="outline" size="lg">
              Record Again
            </Button>
          </>
        )}
      </div>

      {/* Playback Preview */}
      {audioUrl && (
        <audio src={audioUrl} controls className="w-full max-w-md mt-4" />
      )}
    </div>
  );
}

// Icons
function MicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
  );
}

function PauseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function StopIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
    </svg>
  );
}
```

---

## Task 2: Create File Upload Component

**Files:**
- Create: `frontend-next/components/transcribe/file-upload.tsx`

- [ ] **Step 1: Create file upload component**

```typescript
// frontend-next/components/transcribe/file-upload.tsx
'use client';

import { useState, useCallback, useRef } from 'react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSize?: number; // in bytes
  disabled?: boolean;
}

export function FileUpload({
  onFileSelect,
  accept = 'audio/*',
  maxSize = 50 * 1024 * 1024, // 50MB default
  disabled,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (file.size > maxSize) {
      return `File too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB.`;
    }
    return null;
  };

  const handleFile = useCallback(
    (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      setError(null);
      onFileSelect(file);
    },
    [onFileSelect, maxSize]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  return (
    <div className="w-full">
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
          transition-colors
          ${isDragging ? 'border-[#3B82F6] bg-blue-50' : 'border-slate-300 hover:border-slate-400'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          disabled={disabled}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-3">
          <svg
            className="w-12 h-12 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>

          <div>
            <p className="text-slate-700 font-medium">
              Drag & drop your file here
            </p>
            <p className="text-slate-500 text-sm mt-1">
              or click to browse
            </p>
          </div>

          <p className="text-slate-400 text-xs">
            Max file size: {Math.round(maxSize / 1024 / 1024)}MB
          </p>
        </div>
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}
```

---

## Task 3: Create Language Selector Component

**Files:**
- Create: `frontend-next/components/transcribe/language-selector.tsx`

- [ ] **Step 1: Create language selector**

```typescript
// frontend-next/components/transcribe/language-selector.tsx
'use client';

import { useState, useEffect } from 'react';

interface Language {
  code: string;
  name: string;
  nativeName: string;
}

interface LanguageSelectorProps {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
}

export function LanguageSelector({ value, onChange, disabled }: LanguageSelectorProps) {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetch('/api/proxy/languages')
      .then((res) => res.json())
      .then((data) => setLanguages(data))
      .catch(console.error);
  }, []);

  const selectedLanguage = languages.find((l) => l.code === value);

  const filteredLanguages = languages.filter(
    (l) =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.nativeName.toLowerCase().includes(search.toLowerCase()) ||
      l.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-slate-700 mb-1">
        Language
      </label>

      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full flex items-center justify-between h-11 px-4 rounded-xl border border-slate-300 bg-white text-left focus:outline-none focus:ring-2 focus:ring-[#3B82F6] disabled:opacity-50"
      >
        <span className={selectedLanguage ? 'text-slate-900' : 'text-slate-400'}>
          {selectedLanguage ? `${selectedLanguage.name} (${selectedLanguage.nativeName})` : 'Auto-detect'}
        </span>
        <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-64 overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <input
              type="text"
              placeholder="Search languages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
            />
          </div>

          <div className="overflow-y-auto max-h-48">
            <button
              onClick={() => {
                onChange('');
                setIsOpen(false);
              }}
              className="w-full px-4 py-2 text-left hover:bg-slate-50 text-slate-600"
            >
              Auto-detect
            </button>

            {filteredLanguages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  onChange(lang.code);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-2 text-left hover:bg-slate-50 ${
                  value === lang.code ? 'bg-blue-50 text-[#3B82F6]' : 'text-slate-900'
                }`}
              >
                {lang.name} <span className="text-slate-500">({lang.nativeName})</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## Task 4: Create Transcribe Page

**Files:**
- Create: `frontend-next/app/[locale]/transcribe/page.tsx`
- Create: `frontend-next/components/transcribe/transcription-result.tsx`

- [ ] **Step 1: Create transcription result component**

```typescript
// frontend-next/components/transcribe/transcription-result.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface TranscriptionResultProps {
  transcript: string;
  corrected?: string;
  summary?: string;
  language?: string;
  onReset: () => void;
}

export function TranscriptionResult({
  transcript,
  corrected,
  summary,
  language,
  onReset,
}: TranscriptionResultProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Transcript */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Transcription</h3>
          <div className="flex gap-2">
            {language && (
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                {language}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCopy(corrected || transcript)}
            >
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </div>
        <p className="text-slate-700 whitespace-pre-wrap">
          {corrected || transcript}
        </p>
      </div>

      {/* Summary */}
      {summary && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Summary</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCopy(summary)}
            >
              Copy
            </Button>
          </div>
          <p className="text-slate-700 whitespace-pre-wrap">{summary}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={onReset} variant="outline">
          New Transcription
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create transcribe page**

```typescript
// frontend-next/app/[locale]/transcribe/page.tsx
'use client';

import { useState } from 'react';
import { Recorder } from '@/components/transcribe/recorder';
import { FileUpload } from '@/components/transcribe/file-upload';
import { LanguageSelector } from '@/components/transcribe/language-selector';
import { TranscriptionResult } from '@/components/transcribe/transcription-result';
import { Button } from '@/components/ui/button';

type Mode = 'record' | 'upload';

interface TranscriptionResponse {
  transcript: string;
  corrected?: string;
  summary?: string;
  language?: string;
}

export default function TranscribePage() {
  const [mode, setMode] = useState<Mode>('record');
  const [language, setLanguage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TranscriptionResponse | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleTranscribe = async (audioBlob: Blob | File) => {
    setIsProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);
      if (language) {
        formData.append('language', language);
      }

      const response = await fetch('/api/proxy/speech/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Transcription failed');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setSelectedFile(null);
    setError(null);
  };

  if (result) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <TranscriptionResult
            transcript={result.transcript}
            corrected={result.corrected}
            summary={result.summary}
            language={result.language}
            onReset={handleReset}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Transcribe Audio
          </h1>
          <p className="text-slate-600">
            Record or upload audio to get an AI-powered transcription
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex justify-center gap-2 mb-8">
          <Button
            variant={mode === 'record' ? 'default' : 'outline'}
            onClick={() => setMode('record')}
          >
            Record
          </Button>
          <Button
            variant={mode === 'upload' ? 'default' : 'outline'}
            onClick={() => setMode('upload')}
          >
            Upload File
          </Button>
        </div>

        {/* Language Selector */}
        <div className="mb-6">
          <LanguageSelector
            value={language}
            onChange={setLanguage}
            disabled={isProcessing}
          />
        </div>

        {/* Recording / Upload Interface */}
        {mode === 'record' ? (
          <Recorder
            onRecordingComplete={handleTranscribe}
            disabled={isProcessing}
          />
        ) : (
          <div className="space-y-4">
            <FileUpload
              onFileSelect={(file) => setSelectedFile(file)}
              accept="audio/*"
              disabled={isProcessing}
            />

            {selectedFile && (
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <span className="text-slate-700 truncate">{selectedFile.name}</span>
                <Button
                  onClick={() => handleTranscribe(selectedFile)}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Processing...' : 'Transcribe'}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
            {error}
          </div>
        )}

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="mt-6 text-center">
            <div className="inline-flex items-center gap-2 text-slate-600">
              <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Processing your audio...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## Task 5: Create PDF to Audio Page

**Files:**
- Create: `frontend-next/app/[locale]/pdf-to-audio/page.tsx`
- Create: `frontend-next/components/pdf/voice-selector.tsx`
- Create: `frontend-next/components/pdf/audio-player.tsx`

- [ ] **Step 1: Create voice selector**

```typescript
// frontend-next/components/pdf/voice-selector.tsx
'use client';

const VOICES = [
  { id: 'alloy', name: 'Alloy', description: 'Neutral and balanced' },
  { id: 'echo', name: 'Echo', description: 'Warm and conversational' },
  { id: 'fable', name: 'Fable', description: 'Expressive and dramatic' },
  { id: 'onyx', name: 'Onyx', description: 'Deep and authoritative' },
  { id: 'nova', name: 'Nova', description: 'Friendly and upbeat' },
  { id: 'shimmer', name: 'Shimmer', description: 'Clear and professional' },
];

interface VoiceSelectorProps {
  value: string;
  onChange: (voice: string) => void;
  disabled?: boolean;
}

export function VoiceSelector({ value, onChange, disabled }: VoiceSelectorProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">
        Voice
      </label>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {VOICES.map((voice) => (
          <button
            key={voice.id}
            type="button"
            onClick={() => onChange(voice.id)}
            disabled={disabled}
            className={`p-3 rounded-xl border-2 text-left transition-colors ${
              value === voice.id
                ? 'border-[#3B82F6] bg-blue-50'
                : 'border-slate-200 hover:border-slate-300'
            } disabled:opacity-50`}
          >
            <p className="font-medium text-slate-900">{voice.name}</p>
            <p className="text-xs text-slate-500">{voice.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create audio player**

```typescript
// frontend-next/components/pdf/audio-player.tsx
'use client';

import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface AudioPlayerProps {
  src: string;
  onDownload?: () => void;
}

export function AudioPlayer({ src, onDownload }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-slate-50 rounded-xl p-4">
      <audio ref={audioRef} src={src} />

      <div className="flex items-center gap-4">
        <button
          onClick={togglePlay}
          className="w-12 h-12 flex items-center justify-center bg-[#3B82F6] text-white rounded-full hover:bg-[#2563EB] transition-colors"
        >
          {isPlaying ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
          )}
        </button>

        <div className="flex-1">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {onDownload && (
          <Button variant="outline" size="sm" onClick={onDownload}>
            Download
          </Button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create PDF to audio page**

```typescript
// frontend-next/app/[locale]/pdf-to-audio/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileUpload } from '@/components/transcribe/file-upload';
import { VoiceSelector } from '@/components/pdf/voice-selector';
import { AudioPlayer } from '@/components/pdf/audio-player';
import { Button } from '@/components/ui/button';

type Status = 'idle' | 'uploading' | 'processing' | 'completed' | 'error';

interface ConversionResult {
  jobId: string;
  status: string;
  audioData?: string;
  audioDuration?: number;
  pageCount?: number;
  textLength?: number;
  errorMessage?: string;
}

export default function PdfToAudioPage() {
  const [voice, setVoice] = useState('alloy');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // Poll for job status
  const pollStatus = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/proxy/pdf/status/${id}`);
      const data = await response.json();

      if (data.status === 'completed' && data.audioData) {
        // Convert base64 to blob URL
        const blob = base64ToBlob(data.audioData, 'audio/mpeg');
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setResult(data);
        setStatus('completed');
      } else if (data.status === 'failed') {
        setError(data.errorMessage || 'Conversion failed');
        setStatus('error');
      } else {
        // Still processing, poll again
        setTimeout(() => pollStatus(id), 2000);
      }
    } catch (err) {
      setError('Failed to check status');
      setStatus('error');
    }
  }, []);

  const handleFileSelect = async (file: File) => {
    setStatus('uploading');
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('voice', voice);

      const response = await fetch('/api/proxy/pdf/convert', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Upload failed');
      }

      const data = await response.json();
      setJobId(data.jobId);
      setStatus('processing');

      // Start polling
      pollStatus(data.jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setStatus('error');
    }
  };

  const handleDownload = () => {
    if (audioUrl) {
      const a = document.createElement('a');
      a.href = audioUrl;
      a.download = 'converted-audio.mp3';
      a.click();
    }
  };

  const handleReset = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setStatus('idle');
    setError(null);
    setJobId(null);
    setResult(null);
    setAudioUrl(null);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            PDF to Audio
          </h1>
          <p className="text-slate-600">
            Convert PDF documents to natural-sounding audio
          </p>
        </div>

        {status === 'completed' && audioUrl ? (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Your Audio is Ready
              </h3>

              {result && (
                <div className="flex gap-4 text-sm text-slate-600 mb-4">
                  {result.pageCount && <span>{result.pageCount} pages</span>}
                  {result.audioDuration && (
                    <span>{Math.round(result.audioDuration / 60)} min</span>
                  )}
                </div>
              )}

              <AudioPlayer src={audioUrl} onDownload={handleDownload} />
            </div>

            <Button onClick={handleReset} variant="outline" className="w-full">
              Convert Another PDF
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Voice Selector */}
            <VoiceSelector
              value={voice}
              onChange={setVoice}
              disabled={status !== 'idle'}
            />

            {/* File Upload */}
            <FileUpload
              onFileSelect={handleFileSelect}
              accept=".pdf,application/pdf"
              maxSize={10 * 1024 * 1024} // 10MB
              disabled={status !== 'idle'}
            />

            {/* Status Display */}
            {status === 'uploading' && (
              <div className="text-center text-slate-600">
                Uploading PDF...
              </div>
            )}

            {status === 'processing' && (
              <div className="text-center">
                <div className="inline-flex items-center gap-2 text-slate-600">
                  <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Converting to audio... This may take a few minutes.
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
                {error}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="mt-2"
                >
                  Try Again
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function
function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}
```

---

## Validation Checkpoint

After completing all tasks, verify:

- [ ] Can record audio and get transcription
- [ ] Can upload audio file and get transcription
- [ ] Language selector works
- [ ] Transcription result displays correctly with copy functionality
- [ ] PDF upload works
- [ ] Voice selector changes voice
- [ ] PDF conversion completes and shows audio player
- [ ] Can play and download converted audio
- [ ] Anonymous users can use both features (no login required)
- [ ] Logged-in users' requests include auth headers

---

## Next Phase

After validation passes, proceed to **Phase 4: Dashboard + History**
