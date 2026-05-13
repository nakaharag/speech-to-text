import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ShareContent } from './share-content';
import { PasswordPrompt } from './password-prompt';
import { AdBanner } from './ad-banner';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

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

interface ShareMetadata {
  hasPassword: boolean;
  ownerTier: string | null;
  expiresAt: string | null;
}

type Props = {
  params: Promise<{ shortId: string }>;
};

async function getShareMetadata(shortId: string): Promise<ShareMetadata | null> {
  try {
    const response = await fetch(`${BACKEND_URL}/share/${shortId}/metadata`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch {
    return null;
  }
}

async function getShareContent(shortId: string, hasAuth: boolean): Promise<ShareData | null> {
  try {
    const fetchHeaders: Record<string, string> = {};
    if (hasAuth) {
      fetchHeaders['x-share-auth'] = 'true';
    }

    const response = await fetch(`${BACKEND_URL}/share/${shortId}/content`, {
      cache: 'no-store',
      headers: fetchHeaders,
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { shortId } = await params;
  const metadata = await getShareMetadata(shortId);

  if (!metadata) {
    return {
      title: 'Share Not Found - speech-to-text.me',
      description: 'This shared transcription is no longer available.',
    };
  }

  return {
    title: 'Shared Transcription - speech-to-text.me',
    description: 'View this shared transcription from speech-to-text.me',
    openGraph: {
      title: 'Shared Transcription',
      description: 'View this shared transcription from speech-to-text.me',
      type: 'article',
    },
    twitter: {
      card: 'summary',
      title: 'Shared Transcription',
      description: 'View this shared transcription from speech-to-text.me',
    },
  };
}

export default async function SharePage({ params }: Props) {
  const { shortId } = await params;

  // Get share metadata first
  const metadata = await getShareMetadata(shortId);

  if (!metadata) {
    notFound();
  }

  // Check if share is expired
  if (metadata.expiresAt && new Date(metadata.expiresAt) < new Date()) {
    notFound();
  }

  // Check for auth cookie
  const cookieStore = await cookies();
  const authCookie = cookieStore.get(`share_${shortId}_auth`);
  const hasValidAuth = !!authCookie?.value;

  // Determine if we need to show password prompt
  const needsPassword = metadata.hasPassword && !hasValidAuth;

  // Determine if we should show ads
  const showAds = !metadata.ownerTier || metadata.ownerTier === 'free' || metadata.ownerTier === 'basic';

  if (needsPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <PasswordPrompt shortId={shortId} />
      </div>
    );
  }

  // Fetch share content
  const share = await getShareContent(shortId, hasValidAuth);

  if (!share) {
    notFound();
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 py-4">
          <a href="/" className="text-xl font-bold text-slate-900">
            speech-to-text.me
          </a>
        </div>
      </header>

      {/* Top Ad Banner */}
      {showAds && <AdBanner position="top" />}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-3xl flex-1">
        <ShareContent share={share} />
      </main>

      {/* Bottom Ad Banner */}
      {showAds && <AdBanner position="bottom" />}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-slate-500">
          <p>
            Powered by{' '}
            <a href="/" className="text-blue-600 hover:underline">
              speech-to-text.me
            </a>
          </p>
          {share.expiresAt && (
            <p className="mt-2 text-xs">
              This link expires on {new Date(share.expiresAt).toLocaleDateString()}
            </p>
          )}
        </div>
      </footer>
    </div>
  );
}
