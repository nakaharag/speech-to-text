# Phase 6: Share Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable users to share transcriptions via public URLs with optional password protection and watermark branding for free users.

**Architecture:** Generate unique share tokens for transcriptions, create public share pages that display transcription content, support optional password protection using JWT tokens, show watermark branding for free/basic tier shares instead of ads.

**Tech Stack:** Next.js App Router, Prisma, JWT for password auth, nanoid for share tokens

**Prerequisites:** Phase 4.5 (R2 Storage) must be complete for audio playback on share pages.

---

## Task 1: Database Schema for Share Links

**Files:**
- Modify: `frontend-next/prisma/schema.prisma` - Add ShareLink model

### Steps

- [ ] **Step 1.1: Add ShareLink model**

Add to `frontend-next/prisma/schema.prisma`:
```prisma
model ShareLink {
  id              String    @id @default(cuid())
  token           String    @unique @db.VarChar(21) // nanoid
  transcriptionId String
  transcription   Transcription @relation(fields: [transcriptionId], references: [id], onDelete: Cascade)
  passwordHash    String?   // bcrypt hash if password protected
  expiresAt       DateTime?
  viewCount       Int       @default(0)
  maxViews        Int?      // null = unlimited
  createdAt       DateTime  @default(now())
  lastViewedAt    DateTime?

  @@index([token])
  @@index([transcriptionId])
  @@index([expiresAt])
}
```

- [ ] **Step 1.2: Update Transcription model**

Add relation to Transcription model:
```prisma
model Transcription {
  // ... existing fields
  shareLinks ShareLink[]
}
```

- [ ] **Step 1.3: Run migration**

```bash
cd frontend-next && npx prisma migrate dev --name add_share_links
```

- [ ] **Step 1.4: Verify migration**

```bash
npx prisma studio
```
Check that ShareLink table exists with proper columns.

- [ ] **Step 1.5: Commit**

```bash
git add frontend-next/prisma/schema.prisma frontend-next/prisma/migrations/
git commit -m "feat(share): add ShareLink model for shareable transcriptions"
```

---

## Task 2: Install Dependencies

**Files:**
- Modify: `frontend-next/package.json`

### Steps

- [ ] **Step 2.1: Install nanoid for token generation**

```bash
cd frontend-next && npm install nanoid
```

- [ ] **Step 2.2: Commit**

```bash
git add frontend-next/package.json frontend-next/package-lock.json
git commit -m "chore: add nanoid for share token generation"
```

---

## Task 3: Share Link Creation API

**Files:**
- Create: `frontend-next/app/api/share/route.ts`
- Create: `frontend-next/lib/share.ts` - Share utilities

### Steps

- [ ] **Step 3.1: Create share utilities**

Create `frontend-next/lib/share.ts`:
```typescript
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const SHARE_TOKEN_LENGTH = 21;
const JWT_SECRET = process.env.NEXTAUTH_SECRET!;

export function generateShareToken(): string {
  return nanoid(SHARE_TOKEN_LENGTH);
}

export async function hashSharePassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifySharePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateShareAccessToken(shareToken: string): string {
  return jwt.sign(
    { shareToken, type: 'share_access' },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

export function verifyShareAccessToken(token: string): { shareToken: string } | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { shareToken: string; type: string };
    if (payload.type !== 'share_access') return null;
    return { shareToken: payload.shareToken };
  } catch {
    return null;
  }
}

export function formatShareUrl(token: string): string {
  const baseUrl = process.env.NEXTAUTH_URL || 'https://speech-to-text.me';
  return `${baseUrl}/s/${token}`;
}
```

- [ ] **Step 3.2: Create share link creation endpoint**

Create `frontend-next/app/api/share/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import {
  generateShareToken,
  hashSharePassword,
  formatShareUrl,
} from '@/lib/share';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { transcriptionId, password, expiresInDays, maxViews } = body;

    if (!transcriptionId) {
      return NextResponse.json(
        { error: 'Transcription ID is required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const transcription = await prisma.transcription.findFirst({
      where: {
        id: transcriptionId,
        userId: session.user.id,
      },
    });

    if (!transcription) {
      return NextResponse.json(
        { error: 'Transcription not found' },
        { status: 404 }
      );
    }

    // Check existing share link count (limit to 5 per transcription)
    const existingCount = await prisma.shareLink.count({
      where: { transcriptionId },
    });

    if (existingCount >= 5) {
      return NextResponse.json(
        { error: 'Maximum share links reached for this transcription' },
        { status: 400 }
      );
    }

    const token = generateShareToken();
    const passwordHash = password ? await hashSharePassword(password) : null;
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const shareLink = await prisma.shareLink.create({
      data: {
        token,
        transcriptionId,
        passwordHash,
        expiresAt,
        maxViews: maxViews || null,
      },
    });

    return NextResponse.json({
      id: shareLink.id,
      token: shareLink.token,
      url: formatShareUrl(shareLink.token),
      hasPassword: !!passwordHash,
      expiresAt: shareLink.expiresAt,
      maxViews: shareLink.maxViews,
    });
  } catch (error) {
    console.error('Share link creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create share link' },
      { status: 500 }
    );
  }
}

// GET: List share links for a transcription
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const transcriptionId = searchParams.get('transcriptionId');

    if (!transcriptionId) {
      return NextResponse.json(
        { error: 'Transcription ID is required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const transcription = await prisma.transcription.findFirst({
      where: {
        id: transcriptionId,
        userId: session.user.id,
      },
    });

    if (!transcription) {
      return NextResponse.json(
        { error: 'Transcription not found' },
        { status: 404 }
      );
    }

    const shareLinks = await prisma.shareLink.findMany({
      where: { transcriptionId },
      select: {
        id: true,
        token: true,
        expiresAt: true,
        viewCount: true,
        maxViews: true,
        passwordHash: true,
        createdAt: true,
        lastViewedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      shareLinks: shareLinks.map((link) => ({
        id: link.id,
        token: link.token,
        url: formatShareUrl(link.token),
        hasPassword: !!link.passwordHash,
        expiresAt: link.expiresAt,
        viewCount: link.viewCount,
        maxViews: link.maxViews,
        createdAt: link.createdAt,
        lastViewedAt: link.lastViewedAt,
      })),
    });
  } catch (error) {
    console.error('Share links fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch share links' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3.3: Commit**

```bash
git add frontend-next/lib/share.ts frontend-next/app/api/share/route.ts
git commit -m "feat(share): add share link creation and listing API"
```

---

## Task 4: Share Link Delete and Password Verify APIs

**Files:**
- Create: `frontend-next/app/api/share/[token]/route.ts`
- Create: `frontend-next/app/api/share/[token]/verify/route.ts`

### Steps

- [ ] **Step 4.1: Create share link management endpoint**

Create `frontend-next/app/api/share/[token]/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ token: string }>;
}

// DELETE: Delete a share link
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { token } = await params;

    const shareLink = await prisma.shareLink.findUnique({
      where: { token },
      include: {
        transcription: {
          select: { userId: true },
        },
      },
    });

    if (!shareLink) {
      return NextResponse.json(
        { error: 'Share link not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (shareLink.transcription.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    await prisma.shareLink.delete({
      where: { token },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Share link delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete share link' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 4.2: Create password verification endpoint**

Create `frontend-next/app/api/share/[token]/verify/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  verifySharePassword,
  generateShareAccessToken,
} from '@/lib/share';

interface RouteParams {
  params: Promise<{ token: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    const shareLink = await prisma.shareLink.findUnique({
      where: { token },
      select: {
        id: true,
        token: true,
        passwordHash: true,
        expiresAt: true,
        viewCount: true,
        maxViews: true,
      },
    });

    if (!shareLink) {
      return NextResponse.json(
        { error: 'Share link not found' },
        { status: 404 }
      );
    }

    // Check expiration
    if (shareLink.expiresAt && shareLink.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Share link has expired' },
        { status: 410 }
      );
    }

    // Check view limit
    if (shareLink.maxViews && shareLink.viewCount >= shareLink.maxViews) {
      return NextResponse.json(
        { error: 'Share link view limit reached' },
        { status: 410 }
      );
    }

    if (!shareLink.passwordHash) {
      return NextResponse.json(
        { error: 'This share link does not require a password' },
        { status: 400 }
      );
    }

    const isValid = await verifySharePassword(password, shareLink.passwordHash);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }

    // Generate access token
    const accessToken = generateShareAccessToken(shareLink.token);

    return NextResponse.json({
      accessToken,
      expiresIn: 24 * 60 * 60, // 24 hours in seconds
    });
  } catch (error) {
    console.error('Password verification error:', error);
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 4.3: Commit**

```bash
git add frontend-next/app/api/share/[token]/route.ts frontend-next/app/api/share/[token]/verify/route.ts
git commit -m "feat(share): add share link delete and password verification APIs"
```

---

## Task 5: Public Share Page Data API

**Files:**
- Create: `frontend-next/app/api/share/[token]/content/route.ts`

### Steps

- [ ] **Step 5.1: Create share content endpoint**

Create `frontend-next/app/api/share/[token]/content/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifyShareAccessToken } from '@/lib/share';
import { R2StorageService } from '@/lib/r2-storage';

interface RouteParams {
  params: Promise<{ token: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;

    const shareLink = await prisma.shareLink.findUnique({
      where: { token },
      include: {
        transcription: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                tier: true,
              },
            },
          },
        },
      },
    });

    if (!shareLink) {
      return NextResponse.json(
        { error: 'Share link not found' },
        { status: 404 }
      );
    }

    // Check expiration
    if (shareLink.expiresAt && shareLink.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Share link has expired' },
        { status: 410 }
      );
    }

    // Check view limit
    if (shareLink.maxViews && shareLink.viewCount >= shareLink.maxViews) {
      return NextResponse.json(
        { error: 'Share link view limit reached' },
        { status: 410 }
      );
    }

    // Check password protection
    if (shareLink.passwordHash) {
      const cookieStore = await cookies();
      const accessToken = cookieStore.get('share_access_token')?.value;

      if (!accessToken) {
        return NextResponse.json(
          { error: 'Password required', requiresPassword: true },
          { status: 401 }
        );
      }

      const verified = verifyShareAccessToken(accessToken);
      if (!verified || verified.shareToken !== token) {
        return NextResponse.json(
          { error: 'Invalid or expired access token', requiresPassword: true },
          { status: 401 }
        );
      }
    }

    // Update view count
    await prisma.shareLink.update({
      where: { token },
      data: {
        viewCount: { increment: 1 },
        lastViewedAt: new Date(),
      },
    });

    const { transcription } = shareLink;
    const ownerTier = transcription.user?.tier || 'free';
    const showWatermark = ownerTier === 'free' || ownerTier === 'basic';

    // Get audio URL if available
    let audioUrl: string | null = null;
    if (transcription.audioKey) {
      const r2 = new R2StorageService();
      audioUrl = await r2.getPresignedDownloadUrl(transcription.audioKey, 3600); // 1 hour
    }

    return NextResponse.json({
      transcription: {
        id: transcription.id,
        text: transcription.text,
        language: transcription.language,
        duration: transcription.duration,
        createdAt: transcription.createdAt,
        audioUrl,
      },
      owner: {
        name: transcription.user?.name || 'Anonymous',
      },
      showWatermark,
      viewCount: shareLink.viewCount + 1,
    });
  } catch (error) {
    console.error('Share content fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shared content' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 5.2: Commit**

```bash
git add frontend-next/app/api/share/[token]/content/route.ts
git commit -m "feat(share): add public share content API with view tracking"
```

---

## Task 6: Share Page UI Components

**Files:**
- Create: `frontend-next/components/share/PasswordPrompt.tsx`
- Create: `frontend-next/components/share/ShareContent.tsx`
- Create: `frontend-next/components/share/Watermark.tsx`

### Steps

- [ ] **Step 6.1: Create PasswordPrompt component**

Create `frontend-next/components/share/PasswordPrompt.tsx`:
```typescript
'use client';

import { useState } from 'react';

interface PasswordPromptProps {
  token: string;
  onSuccess: () => void;
}

export function PasswordPrompt({ token, onSuccess }: PasswordPromptProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`/api/share/${token}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid password');
        return;
      }

      // Store access token in cookie
      document.cookie = `share_access_token=${data.accessToken}; path=/s/${token}; max-age=${data.expiresIn}; SameSite=Strict`;

      onSuccess();
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <svg
            className="w-16 h-16 mx-auto text-orange-500 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Password Protected
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Enter the password to view this transcription
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              autoFocus
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Unlock'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 6.2: Create Watermark component**

Create `frontend-next/components/share/Watermark.tsx`:
```typescript
import Link from 'next/link';

export function Watermark() {
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Link
        href="/"
        target="_blank"
        className="flex items-center gap-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg hover:shadow-xl transition-shadow"
      >
        <svg
          className="w-5 h-5 text-orange-500"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
        </svg>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          speech-to-text.me
        </span>
      </Link>
    </div>
  );
}
```

- [ ] **Step 6.3: Create ShareContent component**

Create `frontend-next/components/share/ShareContent.tsx`:
```typescript
'use client';

import { useState, useRef } from 'react';
import { Watermark } from './Watermark';

interface ShareContentProps {
  transcription: {
    id: string;
    text: string;
    language: string;
    duration: number | null;
    createdAt: string;
    audioUrl: string | null;
  };
  owner: {
    name: string;
  };
  showWatermark: boolean;
}

export function ShareContent({
  transcription,
  owner,
  showWatermark,
}: ShareContentProps) {
  const [copied, setCopied] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(transcription.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }

  function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Shared Transcription
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Shared by {owner.name}
              </p>
            </div>
            <div className="text-right text-sm text-gray-500 dark:text-gray-400">
              <p>{new Date(transcription.createdAt).toLocaleDateString()}</p>
              {transcription.duration && (
                <p>{formatDuration(transcription.duration)} duration</p>
              )}
            </div>
          </div>

          {/* Language badge */}
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
            {transcription.language || 'Unknown language'}
          </span>
        </div>

        {/* Audio player */}
        {transcription.audioUrl && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Audio Recording
            </h2>
            <audio
              ref={audioRef}
              controls
              className="w-full"
              src={transcription.audioUrl}
            >
              Your browser does not support the audio element.
            </audio>
          </div>
        )}

        {/* Transcription text */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Transcription
            </h2>
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy text
                </>
              )}
            </button>
          </div>

          <div className="prose prose-gray dark:prose-invert max-w-none">
            <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 leading-relaxed">
              {transcription.text}
            </p>
          </div>
        </div>

        {/* CTA for viewers */}
        <div className="mt-8 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Want to transcribe your own audio?
          </p>
          <a
            href="/"
            target="_blank"
            className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors"
          >
            Try speech-to-text.me for free
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </a>
        </div>
      </div>

      {/* Watermark for free/basic users */}
      {showWatermark && <Watermark />}
    </div>
  );
}
```

- [ ] **Step 6.4: Commit**

```bash
git add frontend-next/components/share/
git commit -m "feat(share): add share page UI components with watermark"
```

---

## Task 7: Public Share Page Route

**Files:**
- Create: `frontend-next/app/s/[token]/page.tsx`

### Steps

- [ ] **Step 7.1: Create share page**

Create `frontend-next/app/s/[token]/page.tsx`:
```typescript
'use client';

import { useState, useEffect, use } from 'react';
import { PasswordPrompt } from '@/components/share/PasswordPrompt';
import { ShareContent } from '@/components/share/ShareContent';

interface SharePageProps {
  params: Promise<{ token: string }>;
}

interface ShareData {
  transcription: {
    id: string;
    text: string;
    language: string;
    duration: number | null;
    createdAt: string;
    audioUrl: string | null;
  };
  owner: {
    name: string;
  };
  showWatermark: boolean;
}

export default function SharePage({ params }: SharePageProps) {
  const { token } = use(params);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [data, setData] = useState<ShareData | null>(null);

  useEffect(() => {
    fetchContent();
  }, [token]);

  async function fetchContent() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/share/${token}/content`);
      const json = await res.json();

      if (res.status === 401 && json.requiresPassword) {
        setRequiresPassword(true);
        return;
      }

      if (!res.ok) {
        setError(json.error || 'Failed to load content');
        return;
      }

      setData(json);
      setRequiresPassword(false);
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <svg
            className="animate-spin h-12 w-12 text-orange-500 mx-auto mb-4"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <div className="text-center max-w-md">
          <svg
            className="w-16 h-16 mx-auto text-red-500 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {error === 'Share link not found' ? 'Link Not Found' :
             error === 'Share link has expired' ? 'Link Expired' :
             error === 'Share link view limit reached' ? 'View Limit Reached' :
             'Error'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {error === 'Share link not found'
              ? 'This share link doesn\'t exist or has been deleted.'
              : error === 'Share link has expired'
              ? 'This share link has expired and is no longer available.'
              : error === 'Share link view limit reached'
              ? 'This share link has reached its maximum number of views.'
              : error}
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors"
          >
            Go to speech-to-text.me
          </a>
        </div>
      </div>
    );
  }

  if (requiresPassword) {
    return <PasswordPrompt token={token} onSuccess={fetchContent} />;
  }

  if (data) {
    return (
      <ShareContent
        transcription={data.transcription}
        owner={data.owner}
        showWatermark={data.showWatermark}
      />
    );
  }

  return null;
}
```

- [ ] **Step 7.2: Add metadata for share pages**

Create `frontend-next/app/s/[token]/layout.tsx`:
```typescript
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shared Transcription | speech-to-text.me',
  description: 'View a shared audio transcription',
  robots: 'noindex, nofollow', // Don't index share pages
};

export default function ShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
```

- [ ] **Step 7.3: Commit**

```bash
git add frontend-next/app/s/
git commit -m "feat(share): add public share page with password protection"
```

---

## Task 8: Share Dialog Component for Dashboard

**Files:**
- Create: `frontend-next/components/share/ShareDialog.tsx`

### Steps

- [ ] **Step 8.1: Create ShareDialog component**

Create `frontend-next/components/share/ShareDialog.tsx`:
```typescript
'use client';

import { useState, useEffect } from 'react';

interface ShareLink {
  id: string;
  token: string;
  url: string;
  hasPassword: boolean;
  expiresAt: string | null;
  viewCount: number;
  maxViews: number | null;
  createdAt: string;
}

interface ShareDialogProps {
  transcriptionId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ShareDialog({ transcriptionId, isOpen, onClose }: ShareDialogProps) {
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [password, setPassword] = useState('');
  const [expiresInDays, setExpiresInDays] = useState<number | ''>('');
  const [maxViews, setMaxViews] = useState<number | ''>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchShareLinks();
    }
  }, [isOpen, transcriptionId]);

  async function fetchShareLinks() {
    setLoading(true);
    try {
      const res = await fetch(`/api/share?transcriptionId=${transcriptionId}`);
      if (res.ok) {
        const data = await res.json();
        setShareLinks(data.shareLinks);
      }
    } catch (error) {
      console.error('Error fetching share links:', error);
    } finally {
      setLoading(false);
    }
  }

  async function createShareLink() {
    setCreating(true);
    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcriptionId,
          password: password || undefined,
          expiresInDays: expiresInDays || undefined,
          maxViews: maxViews || undefined,
        }),
      });

      if (res.ok) {
        const newLink = await res.json();
        setShareLinks([newLink, ...shareLinks]);
        setPassword('');
        setExpiresInDays('');
        setMaxViews('');
      }
    } catch (error) {
      console.error('Error creating share link:', error);
    } finally {
      setCreating(false);
    }
  }

  async function deleteShareLink(token: string) {
    try {
      const res = await fetch(`/api/share/${token}`, { method: 'DELETE' });
      if (res.ok) {
        setShareLinks(shareLinks.filter((l) => l.token !== token));
      }
    } catch (error) {
      console.error('Error deleting share link:', error);
    }
  }

  async function copyToClipboard(url: string, id: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Share Transcription
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Create new link */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
            Create Share Link
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                Password (optional)
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave empty for no password"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Expires in (days)
                </label>
                <input
                  type="number"
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(e.target.value ? parseInt(e.target.value) : '')}
                  placeholder="Never"
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Max views
                </label>
                <input
                  type="number"
                  value={maxViews}
                  onChange={(e) => setMaxViews(e.target.value ? parseInt(e.target.value) : '')}
                  placeholder="Unlimited"
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
            <button
              onClick={createShareLink}
              disabled={creating || shareLinks.length >= 5}
              className="w-full py-2 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create Link'}
            </button>
            {shareLinks.length >= 5 && (
              <p className="text-sm text-red-500 text-center">
                Maximum 5 share links per transcription
              </p>
            )}
          </div>
        </div>

        {/* Existing links */}
        <div className="p-6">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
            Active Share Links ({shareLinks.length})
          </h3>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : shareLinks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No share links yet
            </div>
          ) : (
            <div className="space-y-3">
              {shareLinks.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                >
                  <div className="flex-1 min-w-0 mr-4">
                    <div className="flex items-center gap-2 mb-1">
                      {link.hasPassword && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 px-2 py-0.5 rounded">
                          Password
                        </span>
                      )}
                      {link.expiresAt && (
                        <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded">
                          Expires {new Date(link.expiresAt).toLocaleDateString()}
                        </span>
                      )}
                      {link.maxViews && (
                        <span className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 px-2 py-0.5 rounded">
                          {link.viewCount}/{link.maxViews} views
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {link.url}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyToClipboard(link.url, link.id)}
                      className="p-2 text-gray-500 hover:text-orange-500 transition-colors"
                      title="Copy link"
                    >
                      {copiedId === link.id ? (
                        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={() => deleteShareLink(link.token)}
                      className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                      title="Delete link"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 8.2: Commit**

```bash
git add frontend-next/components/share/ShareDialog.tsx
git commit -m "feat(share): add share dialog component for creating/managing links"
```

---

## Task 9: Add Share Button to History Items

**Files:**
- Modify: History list component to include share button

### Steps

- [ ] **Step 9.1: Add share button to history item**

Update the history item component to include a share button:
```typescript
import { useState } from 'react';
import { ShareDialog } from '@/components/share/ShareDialog';

// In the history item component:
const [shareDialogOpen, setShareDialogOpen] = useState(false);

// Add to the action buttons:
<button
  onClick={() => setShareDialogOpen(true)}
  className="p-2 text-gray-500 hover:text-orange-500 transition-colors"
  title="Share"
>
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
  </svg>
</button>

{shareDialogOpen && (
  <ShareDialog
    transcriptionId={item.id}
    isOpen={shareDialogOpen}
    onClose={() => setShareDialogOpen(false)}
  />
)}
```

- [ ] **Step 9.2: Commit**

```bash
git add frontend-next/components/dashboard/HistoryList.tsx
git commit -m "feat(share): add share button to history items"
```

---

## Task 10: i18n Translations for Share Feature

**Files:**
- Modify: `frontend-next/messages/en.json`
- Modify: `frontend-next/messages/es.json`
- Modify: `frontend-next/messages/pt.json`

### Steps

- [ ] **Step 10.1: Add English translations**

Add to `frontend-next/messages/en.json`:
```json
{
  "share": {
    "title": "Share Transcription",
    "createLink": "Create Share Link",
    "password": "Password (optional)",
    "passwordPlaceholder": "Leave empty for no password",
    "expiresIn": "Expires in (days)",
    "maxViews": "Max views",
    "never": "Never",
    "unlimited": "Unlimited",
    "createButton": "Create Link",
    "creating": "Creating...",
    "activeLinks": "Active Share Links",
    "noLinks": "No share links yet",
    "maxLinksReached": "Maximum 5 share links per transcription",
    "copyLink": "Copy link",
    "deleteLink": "Delete link",
    "passwordProtected": "Password Protected",
    "enterPassword": "Enter the password to view this transcription",
    "unlock": "Unlock",
    "verifying": "Verifying...",
    "invalidPassword": "Invalid password",
    "linkNotFound": "Link Not Found",
    "linkExpired": "Link Expired",
    "viewLimitReached": "View Limit Reached",
    "sharedBy": "Shared by",
    "viewCount": "views",
    "expires": "Expires",
    "watermark": "speech-to-text.me",
    "tryFree": "Try speech-to-text.me for free"
  }
}
```

- [ ] **Step 10.2: Add Spanish translations**

Add to `frontend-next/messages/es.json`:
```json
{
  "share": {
    "title": "Compartir Transcripción",
    "createLink": "Crear Enlace",
    "password": "Contraseña (opcional)",
    "passwordPlaceholder": "Dejar vacío sin contraseña",
    "expiresIn": "Expira en (días)",
    "maxViews": "Máx. vistas",
    "never": "Nunca",
    "unlimited": "Ilimitado",
    "createButton": "Crear Enlace",
    "creating": "Creando...",
    "activeLinks": "Enlaces Activos",
    "noLinks": "No hay enlaces todavía",
    "maxLinksReached": "Máximo 5 enlaces por transcripción",
    "copyLink": "Copiar enlace",
    "deleteLink": "Eliminar enlace",
    "passwordProtected": "Protegido con Contraseña",
    "enterPassword": "Ingresa la contraseña para ver esta transcripción",
    "unlock": "Desbloquear",
    "verifying": "Verificando...",
    "invalidPassword": "Contraseña incorrecta",
    "linkNotFound": "Enlace No Encontrado",
    "linkExpired": "Enlace Expirado",
    "viewLimitReached": "Límite de Vistas Alcanzado",
    "sharedBy": "Compartido por",
    "viewCount": "vistas",
    "expires": "Expira",
    "watermark": "speech-to-text.me",
    "tryFree": "Prueba speech-to-text.me gratis"
  }
}
```

- [ ] **Step 10.3: Add Portuguese translations**

Add to `frontend-next/messages/pt.json`:
```json
{
  "share": {
    "title": "Compartilhar Transcrição",
    "createLink": "Criar Link",
    "password": "Senha (opcional)",
    "passwordPlaceholder": "Deixe vazio sem senha",
    "expiresIn": "Expira em (dias)",
    "maxViews": "Máx. visualizações",
    "never": "Nunca",
    "unlimited": "Ilimitado",
    "createButton": "Criar Link",
    "creating": "Criando...",
    "activeLinks": "Links Ativos",
    "noLinks": "Nenhum link ainda",
    "maxLinksReached": "Máximo 5 links por transcrição",
    "copyLink": "Copiar link",
    "deleteLink": "Excluir link",
    "passwordProtected": "Protegido por Senha",
    "enterPassword": "Digite a senha para ver esta transcrição",
    "unlock": "Desbloquear",
    "verifying": "Verificando...",
    "invalidPassword": "Senha incorreta",
    "linkNotFound": "Link Não Encontrado",
    "linkExpired": "Link Expirado",
    "viewLimitReached": "Limite de Visualizações Atingido",
    "sharedBy": "Compartilhado por",
    "viewCount": "visualizações",
    "expires": "Expira",
    "watermark": "speech-to-text.me",
    "tryFree": "Experimente speech-to-text.me grátis"
  }
}
```

- [ ] **Step 10.4: Commit**

```bash
git add frontend-next/messages/
git commit -m "feat(share): add i18n translations for share feature"
```

---

## Verification Checklist

- [ ] Database migration completed successfully
- [ ] Share link creation works with/without password
- [ ] Share link creation respects 5 link limit
- [ ] Password-protected links require correct password
- [ ] JWT access tokens work for password-protected shares
- [ ] Share pages display transcription content correctly
- [ ] Audio playback works on share pages (requires R2 integration)
- [ ] Watermark appears for free/basic tier owners
- [ ] Watermark does NOT appear for pro tier owners
- [ ] View count increments on each view
- [ ] Expired links show appropriate error
- [ ] Max views limit enforced
- [ ] Share dialog allows creating/copying/deleting links
- [ ] Share pages are noindex, nofollow
- [ ] All translations are complete

---

## Security Considerations

1. **Ownership Verification**: Only transcription owners can create/delete share links
2. **Password Hashing**: bcrypt used for share passwords
3. **JWT Tokens**: Short-lived (24h) tokens for password-authenticated access
4. **Rate Limiting**: Consider adding rate limiting to password verification endpoint
5. **No Direct Database Access**: All data fetched through API with ownership checks
6. **Cookie Security**: SameSite=Strict for access tokens

## Privacy Notes

- Share pages are excluded from search engine indexing
- No user email or sensitive data exposed on share pages
- Owner name shown is display name only (can be "Anonymous")
- View counts are private (not shown on public page by default)
