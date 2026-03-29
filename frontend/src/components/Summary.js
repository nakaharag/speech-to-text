import React from 'react';

export function Summary({ text, correctedTranscript, isLoading }) {
  if (!text && !isLoading) {
    return null;
  }

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">AI Summary</span>
      </div>
      <div className={`summary-box ${isLoading ? 'loading' : ''}`}>
        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <div className="spinner" />
            <span>Generating summary...</span>
          </div>
        ) : (
          text
        )}
      </div>
      {correctedTranscript && !isLoading && (
        <details style={{ marginTop: 'var(--spacing-md)' }}>
          <summary style={{
            cursor: 'pointer',
            color: 'var(--color-text-muted)',
            fontSize: '0.875rem'
          }}>
            View corrected transcript
          </summary>
          <div className="transcript-box" style={{ marginTop: 'var(--spacing-sm)' }}>
            {correctedTranscript}
          </div>
        </details>
      )}
    </div>
  );
}

export default Summary;
