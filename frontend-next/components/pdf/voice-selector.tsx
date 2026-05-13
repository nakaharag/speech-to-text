'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';

interface Voice {
  id: string;
  name: string;
  description: string;
}

const VOICES: Voice[] = [
  { id: 'alloy', name: 'Alloy', description: 'Neutral and balanced' },
  { id: 'echo', name: 'Echo', description: 'Warm male voice' },
  { id: 'fable', name: 'Fable', description: 'Expressive storyteller' },
  { id: 'onyx', name: 'Onyx', description: 'Deep and authoritative' },
  { id: 'nova', name: 'Nova', description: 'Friendly female voice' },
  { id: 'shimmer', name: 'Shimmer', description: 'Soft and gentle' },
];

interface VoiceSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function VoiceSelector({ value, onChange, disabled }: VoiceSelectorProps) {
  const t = useTranslations('pdfToAudio.voiceSelector');
  const [isOpen, setIsOpen] = useState(false);
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedVoice = VOICES.find((v) => v.id === value) || VOICES[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handleSelect = (voiceId: string) => {
    onChange(voiceId);
    setIsOpen(false);
  };

  const handlePreview = async (e: React.MouseEvent, voiceId: string) => {
    e.stopPropagation();

    // If already playing this voice, stop it
    if (playingVoice === voiceId && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setPlayingVoice(null);
      return;
    }

    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setPreviewingVoice(voiceId);

    try {
      const response = await fetch(`/api/proxy/tts/preview?voice=${voiceId}`);
      if (!response.ok) throw new Error('Preview failed');

      const data = await response.json();
      if (data.audio) {
        const audio = new Audio(`data:audio/mpeg;base64,${data.audio}`);
        audioRef.current = audio;
        setPlayingVoice(voiceId);

        audio.onended = () => {
          setPlayingVoice(null);
          audioRef.current = null;
        };

        audio.play();
      }
    } catch (error) {
      console.error('Preview failed:', error);
    } finally {
      setPreviewingVoice(null);
    }
  };

  return (
    <div className="w-full max-w-sm" ref={containerRef}>
      <label className="block text-sm font-medium text-slate-700 mb-2">
        {t('label')}
      </label>
      <div className="relative">
        <button
          type="button"
          className={`
            w-full flex items-center justify-between px-4 py-3 bg-white border rounded-lg
            transition-colors text-left
            ${isOpen ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200 hover:border-slate-300'}
            ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'cursor-pointer'}
          `}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
        >
          <div>
            <span className="block text-sm font-medium text-slate-900">{selectedVoice.name}</span>
            <span className="block text-xs text-slate-500">{selectedVoice.description}</span>
          </div>
          <svg
            className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
            {VOICES.map((voice) => (
              <div
                key={voice.id}
                className={`
                  flex items-center justify-between p-3 cursor-pointer
                  ${voice.id === value ? 'bg-blue-50' : 'hover:bg-slate-50'}
                `}
              >
                <button
                  type="button"
                  className="flex-1 text-left"
                  onClick={() => handleSelect(voice.id)}
                >
                  <span className={`block text-sm font-medium ${voice.id === value ? 'text-blue-700' : 'text-slate-900'}`}>
                    {voice.name}
                  </span>
                  <span className="block text-xs text-slate-500">{voice.description}</span>
                </button>
                <button
                  type="button"
                  className={`
                    p-2 rounded-full transition-colors
                    ${playingVoice === voice.id
                      ? 'bg-blue-100 text-blue-600'
                      : 'hover:bg-slate-100 text-slate-500'
                    }
                  `}
                  onClick={(e) => handlePreview(e, voice.id)}
                  disabled={previewingVoice !== null && previewingVoice !== voice.id}
                  title={t('preview')}
                >
                  {previewingVoice === voice.id ? (
                    <div className="w-4 h-4 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
                  ) : playingVoice === voice.id ? (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="6" y="4" width="4" height="16" rx="1" />
                      <rect x="14" y="4" width="4" height="16" rx="1" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
