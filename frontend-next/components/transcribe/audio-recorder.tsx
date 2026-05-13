'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';

const MAX_DURATION = 15; // 15 seconds max
const NUM_BARS = 32;

interface AudioRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  isProcessing: boolean;
}

export function AudioRecorder({ onRecordingComplete, isProcessing }: AudioRecorderProps) {
  const t = useTranslations('transcribe.recorder');
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState<number[]>(Array(NUM_BARS).fill(2));

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    setRecording(false);
    setDuration(0);
    setAudioLevel(Array(NUM_BARS).fill(2));
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Set up audio analyzer for visualization
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Start visualization
      const updateVisualization = () => {
        if (!analyserRef.current) return;

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        const bars: number[] = [];
        const step = Math.floor(dataArray.length / NUM_BARS);
        for (let i = 0; i < NUM_BARS; i++) {
          const value = dataArray[i * step] || 0;
          const height = Math.max(2, Math.min(100, (value / 255) * 100));
          bars.push(height);
        }
        setAudioLevel(bars);

        animationFrameRef.current = requestAnimationFrame(updateVisualization);
      };
      updateVisualization();

      // Set up media recorder
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        onRecordingComplete(audioBlob);
      };

      // Start recording
      mediaRecorder.start();
      setRecording(true);

      // Start timer
      let elapsed = 0;
      timerRef.current = setInterval(() => {
        elapsed += 1;
        setDuration(elapsed);
        if (elapsed >= MAX_DURATION) {
          stopRecording();
        }
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert(t('microphoneError'));
    }
  };

  const handleClick = () => {
    if (recording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, [stopRecording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const remaining = MAX_DURATION - duration;
  const progress = (duration / MAX_DURATION) * 100;

  return (
    <div className="flex flex-col items-center space-y-6 p-6">
      {/* Waveform Visualization */}
      <div className="w-full">
        <div className="flex items-center justify-center gap-1 h-24 bg-slate-100 rounded-xl p-4">
          {audioLevel.map((height, index) => (
            <div
              key={index}
              className={`w-1.5 rounded-full transition-all duration-75 ${
                recording ? 'bg-blue-500' : 'bg-slate-300'
              }`}
              style={{
                height: `${height}%`,
                minHeight: '4px',
              }}
            />
          ))}
        </div>

        {/* Progress Bar */}
        {recording && (
          <div className="mt-2 h-1 w-full bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-1000"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Timer Display */}
      <div className={`text-2xl font-mono ${remaining <= 5 && recording ? 'text-red-500' : 'text-slate-700'}`}>
        <span>{formatTime(duration)}</span>
        <span className="text-slate-400 mx-2">/</span>
        <span className="text-slate-400">{formatTime(MAX_DURATION)}</span>
      </div>

      {/* Record Button */}
      <button
        type="button"
        className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 ${
          recording
            ? 'bg-red-500 hover:bg-red-600 scale-110'
            : isProcessing
            ? 'bg-slate-300 cursor-not-allowed'
            : 'bg-blue-500 hover:bg-blue-600 hover:scale-105'
        }`}
        onClick={handleClick}
        disabled={isProcessing}
        aria-label={recording ? t('stopRecording') : t('startRecording')}
      >
        <div className="relative z-10">
          {isProcessing ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : recording ? (
            <div className="w-6 h-6 bg-white rounded-sm" />
          ) : (
            <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z" />
            </svg>
          )}
        </div>
        {recording && (
          <div className="absolute inset-0 rounded-full border-4 border-red-300 animate-ping" />
        )}
      </button>

      {/* Status Text */}
      <p className="text-sm text-slate-600 flex items-center gap-2">
        {isProcessing ? (
          <>
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            {t('processing')}
          </>
        ) : recording ? (
          <>
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            {t('recording')}
          </>
        ) : (
          t('idle')
        )}
      </p>
    </div>
  );
}
