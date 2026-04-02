import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const ACCEPTED_TYPES = [
  'audio/webm',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/mp3',
  'audio/mpeg',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/ogg',
  'audio/flac',
];

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

export function FileUpload({ onFileSelect, disabled }) {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const validateAndSelectFile = (file) => {
    if (!file) return;

    // Validate file type
    if (!ACCEPTED_TYPES.includes(file.type)) {
      alert(t('fileUpload.unsupportedFormat'));
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      alert(t('fileUpload.fileTooLarge'));
      return;
    }

    onFileSelect(file);
  };

  const handleChange = (e) => {
    const file = e.target.files?.[0];
    validateAndSelectFile(file);
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const file = e.dataTransfer.files?.[0];
    validateAndSelectFile(file);
  };

  return (
    <div
      className={`file-upload-zone ${isDragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''}`}
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        onChange={handleChange}
        style={{ display: 'none' }}
      />

      <div className="file-upload-icon">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      </div>

      <div className="file-upload-text">
        <span className="file-upload-title">
          {isDragging ? t('fileUpload.dropHere') : t('fileUpload.title')}
        </span>
        <span className="file-upload-subtitle">
          {t('fileUpload.dragDrop')}
        </span>
      </div>

      <div className="file-upload-formats">
        <span className="format-badge">MP3</span>
        <span className="format-badge">WAV</span>
        <span className="format-badge">M4A</span>
        <span className="format-badge">WEBM</span>
        <span className="format-badge">OGG</span>
        <span className="format-badge">FLAC</span>
      </div>

      <span className="file-upload-limit">{t('fileUpload.maxSize')}</span>
    </div>
  );
}

export default FileUpload;
