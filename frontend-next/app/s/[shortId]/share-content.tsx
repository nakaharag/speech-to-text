'use client';

import { useState } from 'react';

interface ShareData {
  id: string;
  shortId: string;
  transcript: string;
  corrected: string | null;
  summary: string | null;
  language: string | null;
  audioKey: string | null;
  ownerTier: string | null;
  hasPassword: boolean;
  createdAt: string;
  expiresAt: string | null;
}

interface ShareContentProps {
  share: ShareData;
}

export function ShareContent({ share }: ShareContentProps) {
  const [copiedTranscript, setCopiedTranscript] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const displayText = share.corrected || share.transcript;

  const copyTranscript = async () => {
    try {
      await navigator.clipboard.writeText(displayText);
      setCopiedTranscript(true);
      setTimeout(() => setCopiedTranscript(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const shareToTwitter = () => {
    const text = encodeURIComponent(`Check out this transcription`);
    const url = encodeURIComponent(window.location.href);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
  };

  const shareToFacebook = () => {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
  };

  const shareToWhatsApp = () => {
    const text = encodeURIComponent(`Check out this transcription: ${window.location.href}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Share Info Banner */}
      <div className="flex items-center gap-2 p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 text-sm">
        <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <span>You are viewing a shared transcription</span>
      </div>

      {/* Transcript Panel */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
          <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            Transcription
          </span>
          <button
            type="button"
            className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg transition-colors ${
              copiedTranscript
                ? 'bg-green-100 text-green-700'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
            onClick={copyTranscript}
          >
            {copiedTranscript ? (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                Copy
              </>
            )}
          </button>
        </div>
        <div className="p-4">
          <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{displayText}</p>
        </div>
      </div>

      {/* Summary Panel */}
      {share.summary && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50">
            <svg className="w-4 h-4 text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z" />
              <path d="M12 6a1 1 0 0 1 1 1v5a1 1 0 0 1-2 0V7a1 1 0 0 1 1-1z" />
              <circle cx="12" cy="16" r="1" />
            </svg>
            <span className="text-sm font-medium text-slate-700">AI Summary</span>
          </div>
          <div className="p-4">
            <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{share.summary}</p>
          </div>
        </div>
      )}

      {/* Audio Player - if audio is available */}
      {share.audioKey && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50">
            <svg className="w-4 h-4 text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
            <span className="text-sm font-medium text-slate-700">Audio</span>
          </div>
          <div className="p-4">
            <audio
              controls
              className="w-full"
              preload="metadata"
            >
              <source src={`/api/audio/${share.audioKey}`} type="audio/mpeg" />
              Your browser does not support the audio element.
            </audio>
          </div>
        </div>
      )}

      {/* Share Actions */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50">
          <svg className="w-4 h-4 text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          <span className="text-sm font-medium text-slate-700">Share</span>
        </div>
        <div className="p-4 space-y-4">
          {/* Copy Link */}
          <div className="flex gap-2">
            <input
              type="text"
              value={typeof window !== 'undefined' ? window.location.href : ''}
              readOnly
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600"
            />
            <button
              type="button"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                copiedLink
                  ? 'bg-green-500 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
              onClick={copyLink}
            >
              {copiedLink ? 'Copied!' : 'Copy'}
            </button>
          </div>

          {/* Social Share Buttons */}
          <div className="flex justify-center gap-3">
            <button
              type="button"
              className="p-3 bg-black text-white rounded-full hover:bg-gray-800 transition-colors"
              onClick={shareToTwitter}
              title="Share on X"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </button>
            <button
              type="button"
              className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
              onClick={shareToFacebook}
              title="Share on Facebook"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </button>
            <button
              type="button"
              className="p-3 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors"
              onClick={shareToWhatsApp}
              title="Share on WhatsApp"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">
          Create your own transcriptions
        </h3>
        <p className="text-slate-600 text-sm mb-4">
          Transform speech to text in seconds with AI-powered transcription.
        </p>
        <a
          href="/transcribe"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
          Start Transcribing Free
        </a>
      </div>
    </div>
  );
}
