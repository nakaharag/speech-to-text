'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

interface SharePanelProps {
  transcript: string;
  summary: string;
  corrected: string;
  language: string;
  audioKey?: string;
}

type ExpirationOption = '24h' | '7d' | '30d' | 'never';

interface UserTier {
  tier: string;
}

export function SharePanel({ transcript, summary, corrected, language, audioKey }: SharePanelProps) {
  const t = useTranslations('transcribe.share');
  const [shareUrl, setShareUrl] = useState('');
  const [shareId, setShareId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  // Share options state
  const [showOptions, setShowOptions] = useState(false);
  const [expiration, setExpiration] = useState<ExpirationOption>('7d');
  const [password, setPassword] = useState('');
  const [userTier, setUserTier] = useState<string>('free');

  // Fetch user tier on mount
  useEffect(() => {
    const fetchUserTier = async () => {
      try {
        const response = await fetch('/api/proxy/user/subscription');
        if (response.ok) {
          const data: UserTier = await response.json();
          setUserTier(data.tier || 'free');
        }
      } catch {
        // User might not be logged in, default to free
        setUserTier('free');
      }
    };

    fetchUserTier();
  }, []);

  if (!transcript) {
    return null;
  }

  const isPro = userTier === 'pro' || userTier === 'enterprise';

  const handleCreateShare = async () => {
    setIsCreating(true);
    setError('');
    try {
      const response = await fetch('/api/proxy/share/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          summary,
          corrected,
          language,
          expiration,
          password: password || undefined,
          audioKey: audioKey || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create share link');
      }

      const result = await response.json();
      setShareUrl(result.url);
      setShareId(result.id);
      // Reset options after creating
      setShowOptions(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsCreating(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const shareToTwitter = () => {
    const text = encodeURIComponent(`Check out my transcription: ${shareUrl || transcript.substring(0, 100)}...`);
    window.open(`https://twitter.com/intent/tweet?text=${text}${shareUrl ? `&url=${encodeURIComponent(shareUrl)}` : ''}`, '_blank');
  };

  const shareToFacebook = () => {
    if (shareUrl) {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
    }
  };

  const shareToWhatsApp = () => {
    const text = encodeURIComponent(`Check out my transcription: ${shareUrl || transcript.substring(0, 100)}...`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const getExpirationLabel = (value: ExpirationOption): string => {
    switch (value) {
      case '24h':
        return t('expiration24h');
      case '7d':
        return t('expiration7d');
      case '30d':
        return t('expiration30d');
      case 'never':
        return t('expirationNever');
      default:
        return value;
    }
  };

  const expirationOptions: ExpirationOption[] = isPro
    ? ['24h', '7d', '30d', 'never']
    : ['24h', '7d', '30d'];

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
        <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          {t('title')}
        </span>
      </div>

      <div className="p-4">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {!shareUrl ? (
          <div className="space-y-4">
            {/* Share Options Toggle */}
            <button
              type="button"
              className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
              onClick={() => setShowOptions(!showOptions)}
            >
              <svg
                className={`w-4 h-4 transition-transform ${showOptions ? 'rotate-180' : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
              {t('advancedOptions')}
            </button>

            {/* Advanced Options Panel */}
            {showOptions && (
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-4">
                {/* Expiration Selection */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t('expirationLabel')}
                  </label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {expirationOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                          expiration === option
                            ? 'bg-blue-50 border-blue-300 text-blue-700'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                        onClick={() => setExpiration(option)}
                      >
                        {getExpirationLabel(option)}
                        {option === 'never' && !isPro && (
                          <span className="ml-1 text-xs text-amber-600">(Pro)</span>
                        )}
                      </button>
                    ))}
                  </div>
                  {!isPro && (
                    <p className="mt-2 text-xs text-slate-500">
                      {t('proOnlyNeverExpires')}
                    </p>
                  )}
                </div>

                {/* Password Protection */}
                <div>
                  <label htmlFor="share-password" className="block text-sm font-medium text-slate-700 mb-2">
                    {t('passwordLabel')}
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      id="share-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t('passwordPlaceholder')}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {t('passwordHint')}
                  </p>
                </div>
              </div>
            )}

            {/* Create Share Button */}
            <button
              type="button"
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
              onClick={handleCreateShare}
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t('creating')}
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                  {t('createLink')}
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600"
              />
              <button
                type="button"
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  copied
                    ? 'bg-green-500 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
                onClick={copyLink}
              >
                {copied ? (
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {t('copied')}
                  </span>
                ) : (
                  t('copy')
                )}
              </button>
            </div>

            <div className="flex justify-center gap-3">
              <button
                type="button"
                className="p-3 bg-black text-white rounded-full hover:bg-gray-800 transition-colors"
                onClick={shareToTwitter}
                title={t('shareOnX')}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </button>
              <button
                type="button"
                className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                onClick={shareToFacebook}
                title={t('shareOnFacebook')}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </button>
              <button
                type="button"
                className="p-3 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors"
                onClick={shareToWhatsApp}
                title={t('shareOnWhatsApp')}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </button>
            </div>

            {/* Share Info */}
            <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
              {password && (
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  {t('passwordProtected')}
                </span>
              )}
              <span>{getExpirationLabel(expiration)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
