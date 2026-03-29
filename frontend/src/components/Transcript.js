import React from 'react';

export function Transcript({ text, isLoading }) {
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(text);
      // Could add a toast notification here
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  if (!text && !isLoading) {
    return null;
  }

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Transcript</span>
        {text && (
          <button className="btn btn-outline" onClick={copyToClipboard}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            Copy
          </button>
        )}
      </div>
      <div className={`transcript-box ${isLoading ? 'loading' : ''}`}>
        {isLoading ? (
          <>
            <div className="spinner" />
            <span style={{ marginLeft: '8px' }}>Transcribing...</span>
          </>
        ) : (
          text
        )}
      </div>
    </div>
  );
}

export default Transcript;
