import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { getTtsVoices, previewVoice } from '../utils/api';
import i18n from '../i18n';

const DEFAULT_VOICES = [
  { id: 'alloy', name: 'Alloy', description: 'Neutral and balanced' },
  { id: 'echo', name: 'Echo', description: 'Warm male voice' },
  { id: 'fable', name: 'Fable', description: 'Expressive storyteller' },
  { id: 'onyx', name: 'Onyx', description: 'Deep and authoritative' },
  { id: 'nova', name: 'Nova', description: 'Friendly female voice' },
  { id: 'shimmer', name: 'Shimmer', description: 'Soft and gentle' },
];

export function VoiceSelector({ value, onChange, disabled }) {
  const { t } = useTranslation();
  const [voices, setVoices] = useState(DEFAULT_VOICES);
  const [isOpen, setIsOpen] = useState(false);
  const [previewingVoice, setPreviewingVoice] = useState(null);
  const [playingVoice, setPlayingVoice] = useState(null);
  const audioRef = useRef(null);

  // Fetch voices with current language, refetch when language changes
  useEffect(() => {
    const currentLang = i18n.language || 'en';
    getTtsVoices(currentLang)
      .then((data) => {
        if (data.voices?.length > 0) {
          setVoices(data.voices);
        }
      })
      .catch(() => {
        // Use default voices on error
      });

    // Listen for language changes
    const handleLanguageChange = (lng) => {
      getTtsVoices(lng)
        .then((data) => {
          if (data.voices?.length > 0) {
            setVoices(data.voices);
          }
        })
        .catch(() => {});
    };

    i18n.on('languageChanged', handleLanguageChange);
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
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

  const selectedVoice = voices.find((v) => v.id === value) || voices[0];

  const handleSelect = (voiceId) => {
    onChange(voiceId);
    setIsOpen(false);
  };

  const handlePreview = async (e, voiceId) => {
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
      const currentLang = i18n.language || 'en';
      const response = await previewVoice(voiceId, currentLang);
      if (response.audio) {
        const audio = new Audio(`data:audio/mpeg;base64,${response.audio}`);
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
    <div className="voice-selector">
      <label className="voice-selector-label">
        {t('voiceSelector.label', 'Voice')}
      </label>
      <div className="voice-selector-container">
        <button
          type="button"
          className={`voice-selector-button ${disabled ? 'disabled' : ''}`}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
        >
          <span className="voice-selector-value">
            <span className="voice-name">{selectedVoice.name}</span>
            <span className="voice-description">{selectedVoice.description}</span>
          </span>
          <svg
            className={`voice-selector-arrow ${isOpen ? 'open' : ''}`}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {isOpen && (
          <div className="voice-selector-dropdown">
            {voices.map((voice) => (
              <div
                key={voice.id}
                className={`voice-option ${voice.id === value ? 'selected' : ''}`}
              >
                <button
                  type="button"
                  className="voice-option-content"
                  onClick={() => handleSelect(voice.id)}
                >
                  <span className="voice-name">{voice.name}</span>
                  <span className="voice-description">{voice.description}</span>
                </button>
                <button
                  type="button"
                  className={`voice-preview-btn ${playingVoice === voice.id ? 'playing' : ''}`}
                  onClick={(e) => handlePreview(e, voice.id)}
                  disabled={previewingVoice !== null && previewingVoice !== voice.id}
                  title={t('voiceSelector.preview', 'Preview voice')}
                >
                  {previewingVoice === voice.id ? (
                    <span className="preview-loading" />
                  ) : playingVoice === voice.id ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="6" y="4" width="4" height="16" rx="1" />
                      <rect x="14" y="4" width="4" height="16" rx="1" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
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

export default VoiceSelector;
