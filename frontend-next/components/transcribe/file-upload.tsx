'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

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

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

export function FileUpload({ onFileSelect, disabled }: FileUploadProps) {
  const t = useTranslations('transcribe.fileUpload');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const validateAndSelectFile = (file: File | undefined) => {
    if (!file) return;

    // Validate file type
    if (!ACCEPTED_TYPES.includes(file.type)) {
      alert(t('unsupportedFormat'));
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      alert(t('fileTooLarge'));
      return;
    }

    onFileSelect(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    validateAndSelectFile(file);
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const file = e.dataTransfer.files?.[0];
    validateAndSelectFile(file);
  };

  return (
    <div
      className={`
        relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
        transition-all duration-200
        ${isDragging
          ? 'border-blue-500 bg-blue-50'
          : 'border-slate-300 hover:border-slate-400 bg-slate-50'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
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
        className="hidden"
      />

      <div className="flex flex-col items-center space-y-4">
        <div className="w-12 h-12 text-slate-400">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>

        <div className="space-y-1">
          <p className="text-lg font-medium text-slate-700">
            {isDragging ? t('dropHere') : t('title')}
          </p>
          <p className="text-sm text-slate-500">
            {t('dragDrop')}
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          {['MP3', 'WAV', 'M4A', 'WEBM', 'OGG', 'FLAC'].map((format) => (
            <span
              key={format}
              className="px-2 py-1 text-xs font-medium text-slate-600 bg-slate-200 rounded"
            >
              {format}
            </span>
          ))}
        </div>

        <p className="text-xs text-slate-400">{t('maxSize')}</p>
      </div>
    </div>
  );
}
