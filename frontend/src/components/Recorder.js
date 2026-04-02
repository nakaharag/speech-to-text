import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

const MAX_DURATION = 15; // 15 seconds max
const NUM_BARS = 32; // More bars for smoother visualization

export function Recorder({ onRecordingComplete, isProcessing }) {
  const { t } = useTranslation();
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(Array(NUM_BARS).fill(2));

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);

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

        const bars = [];
        const step = Math.floor(dataArray.length / NUM_BARS);
        for (let i = 0; i < NUM_BARS; i++) {
          const value = dataArray[i * step] || 0;
          // Map to height between 2 and 100 pixels
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
      alert(t('recorder.microphoneError'));
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

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const remaining = MAX_DURATION - duration;
  const progress = (duration / MAX_DURATION) * 100;

  return (
    <div className="recorder-container">
      {/* Waveform Visualization - Full Width */}
      <div className="waveform-container">
        <div className="waveform-bars">
          {audioLevel.map((height, index) => (
            <div
              key={index}
              className={`waveform-bar ${recording ? 'active' : ''}`}
              style={{
                height: `${height}%`,
                animationDelay: recording ? `${index * 30}ms` : '0ms'
              }}
            />
          ))}
        </div>

        {/* Progress Bar */}
        {recording && (
          <div className="recording-progress">
            <div
              className="recording-progress-bar"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Timer Display */}
      <div className={`recorder-timer ${remaining <= 5 && recording ? 'warning' : ''}`}>
        <span className="timer-current">{formatTime(duration)}</span>
        <span className="timer-separator">/</span>
        <span className="timer-max">{formatTime(MAX_DURATION)}</span>
      </div>

      {/* Record Button */}
      <button
        className={`record-btn ${recording ? 'recording' : ''} ${isProcessing ? 'processing' : ''}`}
        onClick={handleClick}
        disabled={isProcessing}
        aria-label={recording ? t('recorder.stopRecording') : t('recorder.startRecording')}
      >
        <div className="record-btn-inner">
          {isProcessing ? (
            <div className="record-spinner" />
          ) : recording ? (
            <div className="record-stop-icon" />
          ) : (
            <svg className="record-mic-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z" />
            </svg>
          )}
        </div>
        <div className="record-btn-ripple" />
      </button>

      {/* Status Text */}
      <p className="recorder-status">
        {isProcessing ? (
          <span className="status-processing">
            <span className="status-dot" />
            {t('recorder.processing')}
          </span>
        ) : recording ? (
          <span className="status-recording">
            <span className="status-dot recording" />
            {t('recorder.recording')}
          </span>
        ) : (
          <span className="status-idle">
            {t('recorder.idle')}
          </span>
        )}
      </p>
    </div>
  );
}

export default Recorder;
