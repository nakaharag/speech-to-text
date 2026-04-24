import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function PdfUpload({ onFileSelect, disabled }) {
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
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      alert(t('pdfUpload.unsupportedFormat', 'Please select a PDF file'));
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      alert(t('pdfUpload.fileTooLarge', 'File exceeds 10MB limit'));
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
        accept="application/pdf,.pdf"
        onChange={handleChange}
        style={{ display: 'none' }}
      />

      <div className="file-upload-icon">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      </div>

      <div className="file-upload-text">
        <span className="file-upload-title">
          {isDragging
            ? t('pdfUpload.dropHere', 'Drop PDF here')
            : t('pdfUpload.title', 'Upload PDF Document')}
        </span>
        <span className="file-upload-subtitle">
          {t('pdfUpload.dragDrop', 'Drag and drop or click to browse')}
        </span>
      </div>

      <div className="file-upload-formats">
        <span className="format-badge">PDF</span>
      </div>

      <span className="file-upload-limit">
        {t('pdfUpload.maxSize', 'Max 10MB, 20 pages')}
      </span>
    </div>
  );
}

export default PdfUpload;
