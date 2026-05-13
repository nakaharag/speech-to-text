'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface PdfUploadProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

export function PdfUpload({ onFileSelect, disabled }: PdfUploadProps) {
  const t = useTranslations('pdfToAudio.upload');
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
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
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
        accept="application/pdf,.pdf"
        onChange={handleChange}
        className="hidden"
      />

      <div className="flex flex-col items-center space-y-4">
        <div className="w-12 h-12 text-slate-400">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
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
          <span className="px-3 py-1 text-sm font-medium text-red-600 bg-red-100 rounded">
            PDF
          </span>
        </div>

        <p className="text-xs text-slate-400">{t('maxSize')}</p>
      </div>
    </div>
  );
}
