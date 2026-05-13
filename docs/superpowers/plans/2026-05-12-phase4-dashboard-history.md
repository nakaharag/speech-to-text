# Phase 4: Dashboard + History

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the user dashboard with usage stats, history list with pagination, and settings page.

**Architecture:** Server Components for initial data, React Query for client-side pagination/filtering. "Last 5" enforcement on backend.

**Tech Stack:** Next.js 16, React Query (TanStack Query), Prisma

**Prerequisites:** Phase 3B complete (transcribe and PDF pages working)

---

## Task 1: Create Usage Stats API and Component

**Files:**
- Create: `frontend-next/app/api/user/stats/route.ts`
- Create: `frontend-next/components/dashboard/usage-stats.tsx`

- [ ] **Step 1: Create usage stats API route**

```typescript
// frontend-next/app/api/user/stats/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  const today = new Date().toISOString().split('T')[0];
  const thisMonth = today.substring(0, 7);

  // Get or create usage counter
  let usageCounter = await prisma.usageCounter.findUnique({
    where: { userId },
  });

  if (!usageCounter) {
    usageCounter = await prisma.usageCounter.create({
      data: {
        userId,
        transcriptionsToday: 0,
        transcriptionsDate: today,
        ocrThisMonth: 0,
        ocrMonth: thisMonth,
      },
    });
  }

  // Reset counters if date changed
  if (usageCounter.transcriptionsDate !== today) {
    usageCounter = await prisma.usageCounter.update({
      where: { userId },
      data: {
        transcriptionsToday: 0,
        transcriptionsDate: today,
      },
    });
  }

  if (usageCounter.ocrMonth !== thisMonth) {
    usageCounter = await prisma.usageCounter.update({
      where: { userId },
      data: {
        ocrThisMonth: 0,
        ocrMonth: thisMonth,
      },
    });
  }

  // Get user tier and limits
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tier: true },
  });

  const tier = user?.tier || 'free';

  // Define limits by tier
  const limits: Record<string, { transcriptions: number; ocr: number }> = {
    free: { transcriptions: 5, ocr: 5 },
    basic: { transcriptions: 15, ocr: 5 },
    pro: { transcriptions: -1, ocr: 100 }, // -1 = unlimited
    enterprise: { transcriptions: -1, ocr: -1 },
  };

  const tierLimits = limits[tier] || limits.free;

  // Get total counts
  const totalTranscriptions = await prisma.transcription.count({
    where: { userId },
  });

  const totalPdfConversions = await prisma.pdfConversion.count({
    where: { userId },
  });

  return NextResponse.json({
    tier,
    transcriptionsToday: usageCounter.transcriptionsToday,
    transcriptionsLimit: tierLimits.transcriptions,
    ocrThisMonth: usageCounter.ocrThisMonth,
    ocrLimit: tierLimits.ocr,
    totalTranscriptions,
    totalPdfConversions,
  });
}
```

- [ ] **Step 2: Create usage stats component**

```typescript
// frontend-next/components/dashboard/usage-stats.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface UsageStatsProps {
  stats: {
    tier: string;
    transcriptionsToday: number;
    transcriptionsLimit: number;
    ocrThisMonth: number;
    ocrLimit: number;
    totalTranscriptions: number;
    totalPdfConversions: number;
  };
}

export function UsageStats({ stats }: UsageStatsProps) {
  const formatLimit = (used: number, limit: number) => {
    if (limit === -1) return `${used} / ∞`;
    return `${used} / ${limit}`;
  };

  const getProgressColor = (used: number, limit: number) => {
    if (limit === -1) return 'bg-[#3B82F6]';
    const ratio = used / limit;
    if (ratio >= 1) return 'bg-red-500';
    if (ratio >= 0.8) return 'bg-yellow-500';
    return 'bg-[#10B981]';
  };

  const getProgressWidth = (used: number, limit: number) => {
    if (limit === -1) return '10%'; // Show small bar for unlimited
    return `${Math.min((used / limit) * 100, 100)}%`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Transcriptions Today */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-500">
            Transcriptions Today
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-slate-900">
            {formatLimit(stats.transcriptionsToday, stats.transcriptionsLimit)}
          </p>
          <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full ${getProgressColor(stats.transcriptionsToday, stats.transcriptionsLimit)} transition-all`}
              style={{ width: getProgressWidth(stats.transcriptionsToday, stats.transcriptionsLimit) }}
            />
          </div>
          {stats.transcriptionsLimit !== -1 && stats.transcriptionsToday >= stats.transcriptionsLimit && (
            <p className="text-xs text-red-500 mt-1">Daily limit reached</p>
          )}
        </CardContent>
      </Card>

      {/* PDF/OCR This Month */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-500">
            PDF Conversions (Month)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-slate-900">
            {formatLimit(stats.ocrThisMonth, stats.ocrLimit)}
          </p>
          <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full ${getProgressColor(stats.ocrThisMonth, stats.ocrLimit)} transition-all`}
              style={{ width: getProgressWidth(stats.ocrThisMonth, stats.ocrLimit) }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Total Items */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-500">
            Total in History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-slate-900">
            {stats.totalTranscriptions + stats.totalPdfConversions}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {stats.totalTranscriptions} transcriptions, {stats.totalPdfConversions} PDFs
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Task 2: Create History API with "Last 5" Enforcement

**Files:**
- Create: `frontend-next/app/api/user/history/route.ts`

- [ ] **Step 1: Create history API with cursor pagination**

```typescript
// frontend-next/app/api/user/history/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  const { searchParams } = request.nextUrl;

  const cursor = searchParams.get('cursor');
  const type = searchParams.get('type'); // 'transcription' | 'pdf' | null
  const limit = parseInt(searchParams.get('limit') || '10', 10);

  // Get user tier for "last 5" enforcement
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tier: true },
  });

  const tier = user?.tier || 'free';
  const isLimitedTier = tier === 'free' || tier === 'basic';

  // For limited tiers, enforce "last 5" by limiting total items
  const effectiveLimit = isLimitedTier ? Math.min(limit, 5) : limit;

  // Build combined history
  const items: any[] = [];

  if (!type || type === 'transcription') {
    const transcriptions = await prisma.transcription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: effectiveLimit + 1, // +1 to check if there's more
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      select: {
        id: true,
        transcript: true,
        corrected: true,
        summary: true,
        language: true,
        fileName: true,
        audioDuration: true,
        createdAt: true,
      },
    });

    items.push(
      ...transcriptions.map((t) => ({
        ...t,
        type: 'transcription' as const,
        title: t.fileName || t.transcript.substring(0, 50) + '...',
      }))
    );
  }

  if (!type || type === 'pdf') {
    const pdfConversions = await prisma.pdfConversion.findMany({
      where: { userId, status: 'completed' },
      orderBy: { createdAt: 'desc' },
      take: effectiveLimit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      select: {
        id: true,
        fileName: true,
        pageCount: true,
        audioDuration: true,
        voice: true,
        createdAt: true,
      },
    });

    items.push(
      ...pdfConversions.map((p) => ({
        ...p,
        type: 'pdf' as const,
        title: p.fileName || 'PDF Conversion',
      }))
    );
  }

  // Sort combined items by date
  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Apply effective limit
  const limitedItems = items.slice(0, effectiveLimit);
  const hasMore = items.length > effectiveLimit && !isLimitedTier;
  const nextCursor = hasMore ? limitedItems[limitedItems.length - 1]?.id : null;

  // For limited tiers, get total count to show upgrade prompt
  let hiddenCount = 0;
  if (isLimitedTier) {
    const totalTranscriptions = await prisma.transcription.count({ where: { userId } });
    const totalPdf = await prisma.pdfConversion.count({ where: { userId, status: 'completed' } });
    hiddenCount = Math.max(0, totalTranscriptions + totalPdf - 5);
  }

  return NextResponse.json({
    items: limitedItems,
    nextCursor,
    hasMore,
    isLimited: isLimitedTier,
    hiddenCount,
  });
}
```

---

## Task 3: Create History List Component

**Files:**
- Create: `frontend-next/components/dashboard/history-list.tsx`
- Create: `frontend-next/components/dashboard/history-item.tsx`

- [ ] **Step 1: Create history item component**

```typescript
// frontend-next/components/dashboard/history-item.tsx
import Link from 'next/link';

interface HistoryItemProps {
  item: {
    id: string;
    type: 'transcription' | 'pdf';
    title: string;
    createdAt: string;
    audioDuration?: number;
    pageCount?: number;
    language?: string;
  };
}

export function HistoryItem({ item }: HistoryItemProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-colors">
      {/* Icon */}
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
        item.type === 'transcription' ? 'bg-blue-100 text-[#3B82F6]' : 'bg-purple-100 text-[#8B5CF6]'
      }`}>
        {item.type === 'transcription' ? (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-slate-900 font-medium truncate">{item.title}</p>
        <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
          <span>{formatDate(item.createdAt)}</span>
          {item.audioDuration && <span>{formatDuration(item.audioDuration)}</span>}
          {item.pageCount && <span>{item.pageCount} pages</span>}
          {item.language && <span className="uppercase">{item.language}</span>}
        </div>
      </div>

      {/* Type Badge */}
      <span className={`text-xs px-2 py-1 rounded ${
        item.type === 'transcription' ? 'bg-blue-50 text-[#3B82F6]' : 'bg-purple-50 text-[#8B5CF6]'
      }`}>
        {item.type === 'transcription' ? 'Audio' : 'PDF'}
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Create history list component**

```typescript
// frontend-next/components/dashboard/history-list.tsx
'use client';

import { useState, useEffect } from 'react';
import { HistoryItem } from './history-item';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface HistoryListProps {
  initialData?: {
    items: any[];
    nextCursor: string | null;
    hasMore: boolean;
    isLimited: boolean;
    hiddenCount: number;
  };
}

export function HistoryList({ initialData }: HistoryListProps) {
  const [data, setData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [filter, setFilter] = useState<'all' | 'transcription' | 'pdf'>('all');

  useEffect(() => {
    if (!initialData) {
      fetchHistory();
    }
  }, [initialData]);

  useEffect(() => {
    fetchHistory();
  }, [filter]);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.set('type', filter);

      const response = await fetch(`/api/user/history?${params}`);
      const newData = await response.json();
      setData(newData);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMore = async () => {
    if (!data?.nextCursor) return;

    setIsLoading(true);
    try {
      const params = new URLSearchParams({ cursor: data.nextCursor });
      if (filter !== 'all') params.set('type', filter);

      const response = await fetch(`/api/user/history?${params}`);
      const newData = await response.json();

      setData((prev) => ({
        ...newData,
        items: [...(prev?.items || []), ...newData.items],
      }));
    } catch (error) {
      console.error('Error loading more:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(['all', 'transcription', 'pdf'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-[#3B82F6] text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {f === 'all' ? 'All' : f === 'transcription' ? 'Audio' : 'PDF'}
          </button>
        ))}
      </div>

      {/* Items */}
      {isLoading && !data?.items.length ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : data?.items.length ? (
        <div className="space-y-3">
          {data.items.map((item) => (
            <HistoryItem key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-slate-500">
          <p>No items yet</p>
          <p className="text-sm mt-1">Start transcribing to see your history here</p>
        </div>
      )}

      {/* Upgrade Prompt for Limited Users */}
      {data?.isLimited && data.hiddenCount > 0 && (
        <div className="bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] rounded-xl p-4 text-white">
          <p className="font-medium">
            You have {data.hiddenCount} more items in your history
          </p>
          <p className="text-sm text-white/80 mt-1">
            Upgrade to Pro to access your full history
          </p>
          <Link href="/pricing">
            <Button variant="secondary" size="sm" className="mt-3 bg-white text-[#3B82F6]">
              View Plans
            </Button>
          </Link>
        </div>
      )}

      {/* Load More */}
      {data?.hasMore && (
        <Button
          variant="outline"
          onClick={loadMore}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'Loading...' : 'Load More'}
        </Button>
      )}
    </div>
  );
}
```

---

## Task 4: Update Dashboard Page

**Files:**
- Modify: `frontend-next/app/(protected)/dashboard/page.tsx`

- [ ] **Step 1: Update dashboard to use new components**

```typescript
// frontend-next/app/(protected)/dashboard/page.tsx
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { UsageStats } from '@/components/dashboard/usage-stats';
import { HistoryList } from '@/components/dashboard/history-list';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

async function getStats(userId: string) {
  const today = new Date().toISOString().split('T')[0];
  const thisMonth = today.substring(0, 7);

  let usageCounter = await prisma.usageCounter.findUnique({
    where: { userId },
  });

  if (!usageCounter) {
    usageCounter = await prisma.usageCounter.create({
      data: {
        userId,
        transcriptionsToday: 0,
        transcriptionsDate: today,
        ocrThisMonth: 0,
        ocrMonth: thisMonth,
      },
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tier: true },
  });

  const tier = user?.tier || 'free';

  const limits: Record<string, { transcriptions: number; ocr: number }> = {
    free: { transcriptions: 5, ocr: 5 },
    basic: { transcriptions: 15, ocr: 5 },
    pro: { transcriptions: -1, ocr: 100 },
    enterprise: { transcriptions: -1, ocr: -1 },
  };

  const tierLimits = limits[tier] || limits.free;

  const totalTranscriptions = await prisma.transcription.count({ where: { userId } });
  const totalPdfConversions = await prisma.pdfConversion.count({ where: { userId } });

  return {
    tier,
    transcriptionsToday: usageCounter.transcriptionsDate === today ? usageCounter.transcriptionsToday : 0,
    transcriptionsLimit: tierLimits.transcriptions,
    ocrThisMonth: usageCounter.ocrMonth === thisMonth ? usageCounter.ocrThisMonth : 0,
    ocrLimit: tierLimits.ocr,
    totalTranscriptions,
    totalPdfConversions,
  };
}

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const stats = await getStats(session.user.id);

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome back, {session.user.name || 'there'}!
          </h1>
          <p className="text-slate-600">
            Your plan: <span className="font-medium capitalize">{stats.tier}</span>
            {stats.tier === 'free' && (
              <Link href="/pricing" className="ml-2 text-[#3B82F6] hover:underline">
                Upgrade
              </Link>
            )}
          </p>
        </div>

        <div className="flex gap-3">
          <Link href="/transcribe">
            <Button>New Transcription</Button>
          </Link>
          <Link href="/pdf-to-audio">
            <Button variant="outline">Convert PDF</Button>
          </Link>
        </div>
      </div>

      {/* Usage Stats */}
      <UsageStats stats={stats} />

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent History</CardTitle>
        </CardHeader>
        <CardContent>
          <HistoryList />
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Task 5: Create Settings Page with Password Change

**Files:**
- Modify: `frontend-next/app/(protected)/dashboard/settings/page.tsx`
- Create: `frontend-next/components/settings/profile-form.tsx`
- Create: `frontend-next/components/settings/password-form.tsx`
- Create: `frontend-next/app/api/user/profile/route.ts`
- Create: `frontend-next/app/api/user/password/route.ts`

- [ ] **Step 1: Create profile update API**

```typescript
// frontend-next/app/api/user/profile/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name } = await request.json();

    await prisma.user.update({
      where: { id: session.user.id },
      data: { name },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create password change API**

```typescript
// frontend-next/app/api/user/password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hashPassword, verifyPassword, validatePassword } from '@/lib/password';

export async function PUT(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { currentPassword, newPassword } = await request.json();

    // Get user with password hash
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { passwordHash: true },
    });

    if (!user?.passwordHash) {
      return NextResponse.json(
        { error: 'Password change not available for OAuth accounts' },
        { status: 400 }
      );
    }

    // Verify current password
    const isValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
    }

    // Validate new password
    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Hash and save new password
    const newHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: session.user.id },
      data: { passwordHash: newHash },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to change password' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Create profile form component**

```typescript
// frontend-next/components/settings/profile-form.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ProfileFormProps {
  initialName: string;
  email: string;
}

export function ProfileForm({ initialName, email }: ProfileFormProps) {
  const [name, setName] = useState(initialName);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Profile updated successfully' });
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.error || 'Failed to update' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {message && (
        <div className={`p-3 rounded-lg text-sm ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
        <Input value={email} disabled className="bg-slate-50" />
        <p className="text-xs text-slate-500 mt-1">Email cannot be changed</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
        />
      </div>

      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Saving...' : 'Save Changes'}
      </Button>
    </form>
  );
}
```

- [ ] **Step 4: Create password form component**

```typescript
// frontend-next/components/settings/password-form.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface PasswordFormProps {
  hasPassword: boolean;
}

export function PasswordForm({ hasPassword }: PasswordFormProps) {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!hasPassword) {
    return (
      <div className="text-slate-500 text-sm">
        <p>Password change is not available for accounts created with social login.</p>
        <p className="mt-1">You can add a password by using the "Forgot Password" flow.</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (formData.newPassword !== formData.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/user/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Password changed successfully' });
        setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.error || 'Failed to change password' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {message && (
        <div className={`p-3 rounded-lg text-sm ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
        <Input
          type="password"
          value={formData.currentPassword}
          onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
        <Input
          type="password"
          value={formData.newPassword}
          onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
          placeholder="Min 8 chars, 1 letter, 1 number"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
        <Input
          type="password"
          value={formData.confirmPassword}
          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
          required
        />
      </div>

      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Changing...' : 'Change Password'}
      </Button>
    </form>
  );
}
```

- [ ] **Step 5: Update settings page**

```typescript
// frontend-next/app/(protected)/dashboard/settings/page.tsx
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProfileForm } from '@/components/settings/profile-form';
import { PasswordForm } from '@/components/settings/password-form';
import { ConnectedAccounts } from '@/components/settings/connected-accounts';

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, passwordHash: true },
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-600">Manage your account settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm
            initialName={user?.name || ''}
            email={user?.email || session.user.email}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
        </CardHeader>
        <CardContent>
          <PasswordForm hasPassword={!!user?.passwordHash} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Connected Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <ConnectedAccounts userId={session.user.id} />
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Validation Checkpoint

After completing all tasks, verify:

- [ ] Dashboard shows accurate usage stats
- [ ] Usage stats update after transcription/PDF conversion
- [ ] History list shows user's items
- [ ] Filter by type (Audio/PDF) works
- [ ] Free/Basic users only see last 5 items
- [ ] Upgrade prompt shows with hidden item count
- [ ] Load more pagination works (for Pro users)
- [ ] Profile update works
- [ ] Password change works (for email/password accounts)
- [ ] Connected accounts display correctly

---

## Next Phase

After validation passes, proceed to **Phase 4.5: R2 Storage**
