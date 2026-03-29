import React, { useState, useRef, useEffect, useCallback } from 'react';

const MAX_DURATION = 15; // 15 seconds max

export function Recorder({ onRecordingComplete, isProcessing }) {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(Array(12).fill(4));

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const streamRef = useRef(null);

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
    setRecording(false);
    setDuration(0);
    setAudioLevel(Array(12).fill(4));
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Set up audio analyzer for visualization
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Start visualization
      const updateVisualization = () => {
        if (!analyserRef.current) return;

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        const bars = [];
        const step = Math.floor(dataArray.length / 12);
        for (let i = 0; i < 12; i++) {
          const value = dataArray[i * step];
          const height = Math.max(4, (value / 255) * 40);
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
      alert('Could not access microphone. Please check permissions.');
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

  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <button
        className={`record-btn ${recording ? 'recording' : ''}`}
        onClick={handleClick}
        disabled={isProcessing}
        aria-label={recording ? 'Stop recording' : 'Start recording'}
      >
        {isProcessing ? (
          <div className="spinner" />
        ) : (
          <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
            {recording ? (
              <rect x="6" y="6" width="12" height="12" rx="2" />
            ) : (
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z" />
            )}
          </svg>
        )}
      </button>

      {/* Waveform Visualization */}
      <div className="waveform">
        {audioLevel.map((height, index) => (
          <div
            key={index}
            className="waveform-bar"
            style={{ height: `${height}px` }}
          />
        ))}
      </div>

      {/* Timer */}
      <div className={`timer ${remaining <= 5 && recording ? 'warning' : ''}`}>
        {recording ? formatTime(duration) : formatTime(0)} / {formatTime(MAX_DURATION)}
      </div>

      <p style={{
        fontSize: '0.875rem',
        color: 'var(--color-text-muted)',
        marginTop: 'var(--spacing-sm)'
      }}>
        {isProcessing ? 'Processing...' : recording ? 'Recording... Click to stop' : 'Click to start recording'}
      </p>
    </div>
  );
}

export default Recorder;
