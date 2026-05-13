# Phase 7: Polish, Testing & Production Readiness

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure production readiness through comprehensive testing, observability, performance optimization, accessibility compliance, and deployment verification.

**Architecture:** Add error boundaries and loading states throughout the app, implement observability with structured logging, create end-to-end test suite, audit accessibility, optimize performance, and document rollback procedures.

**Tech Stack:** Playwright (E2E), Vitest (unit), React Error Boundaries, next/font optimization, Web Vitals

**Prerequisites:** All previous phases (1-6) must be complete and functional.

---

## Task 1: Error Boundaries Implementation

**Files:**
- Create: `frontend-next/components/ErrorBoundary.tsx`
- Create: `frontend-next/app/error.tsx` (App Router error boundary)
- Create: `frontend-next/app/global-error.tsx`

### Steps

- [ ] **Step 1.1: Create reusable ErrorBoundary component**

Create `frontend-next/components/ErrorBoundary.tsx`:
```typescript
'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <h2 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
            Something went wrong
          </h2>
          <p className="text-red-600 dark:text-red-300 mb-4">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

- [ ] **Step 1.2: Create app-level error page**

Create `frontend-next/app/error.tsx`:
```typescript
'use client';

import { useEffect } from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('App error:', error);
  }, [error]);

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
          Something went wrong
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          We encountered an unexpected error. Please try again.
        </p>
        <button
          onClick={reset}
          className="px-6 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 1.3: Create global error boundary**

Create `frontend-next/app/global-error.tsx`:
```typescript
'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
          <div className="text-center max-w-md">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Critical Error
            </h1>
            <p className="text-gray-600 mb-6">
              A critical error occurred. Please refresh the page.
            </p>
            <button
              onClick={reset}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600"
            >
              Refresh
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
```

- [ ] **Step 1.4: Commit**

```bash
git add frontend-next/components/ErrorBoundary.tsx frontend-next/app/error.tsx frontend-next/app/global-error.tsx
git commit -m "feat(polish): add error boundaries for graceful error handling"
```

---

## Task 2: Loading States and Skeletons

**Files:**
- Create: `frontend-next/components/ui/Skeleton.tsx`
- Create: `frontend-next/components/ui/LoadingSpinner.tsx`
- Create: `frontend-next/app/loading.tsx`
- Create: `frontend-next/app/dashboard/loading.tsx`

### Steps

- [ ] **Step 2.1: Create Skeleton component**

Create `frontend-next/components/ui/Skeleton.tsx`:
```typescript
interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({
  className = '',
  variant = 'text',
  width,
  height,
}: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-gray-200 dark:bg-gray-700';

  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  const style = {
    width: width || (variant === 'text' ? '100%' : undefined),
    height: height || (variant === 'text' ? '1em' : undefined),
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <Skeleton variant="text" height={24} width="60%" className="mb-4" />
      <Skeleton variant="text" height={16} className="mb-2" />
      <Skeleton variant="text" height={16} className="mb-2" />
      <Skeleton variant="text" height={16} width="80%" />
    </div>
  );
}

export function SkeletonHistoryItem() {
  return (
    <div className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg">
      <Skeleton variant="circular" width={40} height={40} />
      <div className="flex-1">
        <Skeleton variant="text" height={18} width="40%" className="mb-2" />
        <Skeleton variant="text" height={14} width="70%" />
      </div>
      <Skeleton variant="rectangular" width={80} height={32} />
    </div>
  );
}
```

- [ ] **Step 2.2: Create LoadingSpinner component**

Create `frontend-next/components/ui/LoadingSpinner.tsx`:
```typescript
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <svg
      className={`animate-spin text-orange-500 ${sizeClasses[size]} ${className}`}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

export function FullPageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <LoadingSpinner size="lg" className="mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2.3: Create app loading state**

Create `frontend-next/app/loading.tsx`:
```typescript
import { FullPageLoader } from '@/components/ui/LoadingSpinner';

export default function Loading() {
  return <FullPageLoader />;
}
```

- [ ] **Step 2.4: Create dashboard loading state**

Create `frontend-next/app/dashboard/loading.tsx`:
```typescript
import { SkeletonCard, SkeletonHistoryItem } from '@/components/ui/Skeleton';

export default function DashboardLoading() {
  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Stats skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>

      {/* History skeleton */}
      <div className="space-y-4">
        <SkeletonHistoryItem />
        <SkeletonHistoryItem />
        <SkeletonHistoryItem />
        <SkeletonHistoryItem />
        <SkeletonHistoryItem />
      </div>
    </div>
  );
}
```

- [ ] **Step 2.5: Commit**

```bash
git add frontend-next/components/ui/Skeleton.tsx frontend-next/components/ui/LoadingSpinner.tsx frontend-next/app/loading.tsx frontend-next/app/dashboard/loading.tsx
git commit -m "feat(polish): add loading states and skeleton components"
```

---

## Task 3: Accessibility Audit and Fixes

**Files:**
- Modify: Various component files for a11y improvements
- Create: `frontend-next/lib/a11y.ts` - Accessibility utilities

### Steps

- [ ] **Step 3.1: Create accessibility utilities**

Create `frontend-next/lib/a11y.ts`:
```typescript
// Keyboard navigation helpers
export function handleKeyboardActivation(
  event: React.KeyboardEvent,
  callback: () => void
) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    callback();
  }
}

// Focus trap for modals
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const focusableSelectors = [
    'button:not([disabled])',
    'a[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  return Array.from(container.querySelectorAll(focusableSelectors));
}

export function trapFocus(container: HTMLElement) {
  const focusable = getFocusableElements(container);
  if (focusable.length === 0) return;

  const firstElement = focusable[0];
  const lastElement = focusable[focusable.length - 1];

  function handleTab(e: KeyboardEvent) {
    if (e.key !== 'Tab') return;

    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault();
      lastElement.focus();
    } else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault();
      firstElement.focus();
    }
  }

  container.addEventListener('keydown', handleTab);
  return () => container.removeEventListener('keydown', handleTab);
}

// Screen reader announcements
export function announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);
  setTimeout(() => announcement.remove(), 1000);
}
```

- [ ] **Step 3.2: Add skip link for keyboard navigation**

Add to `frontend-next/app/layout.tsx`:
```typescript
// Add as first child in body
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-orange-500 focus:text-white focus:rounded-lg"
>
  Skip to main content
</a>

// Add id to main content area
<main id="main-content" className="...">
```

- [ ] **Step 3.3: Audit and fix form labels**

Ensure all form inputs have proper labels:
```typescript
// Bad
<input type="email" placeholder="Email" />

// Good
<label htmlFor="email" className="sr-only">Email address</label>
<input id="email" type="email" placeholder="Email" aria-label="Email address" />
```

- [ ] **Step 3.4: Add ARIA labels to icon buttons**

Update all icon-only buttons:
```typescript
// Bad
<button onClick={handlePlay}><PlayIcon /></button>

// Good
<button onClick={handlePlay} aria-label="Play audio">
  <PlayIcon aria-hidden="true" />
</button>
```

- [ ] **Step 3.5: Ensure color contrast compliance**

Verify these color combinations meet WCAG AA (4.5:1 for text):
- Orange-500 (#f97316) on white: OK for large text, use darker for small
- Gray-600 (#4b5563) on white: OK
- White on Orange-500: OK

Update any failing contrast ratios in Tailwind config or component styles.

- [ ] **Step 3.6: Add focus indicators**

Add to global CSS or Tailwind config:
```css
/* Visible focus indicators */
:focus-visible {
  outline: 2px solid #f97316;
  outline-offset: 2px;
}

/* Remove outline for mouse users */
:focus:not(:focus-visible) {
  outline: none;
}
```

- [ ] **Step 3.7: Commit**

```bash
git add frontend-next/lib/a11y.ts frontend-next/app/layout.tsx
git commit -m "feat(polish): add accessibility utilities and improvements"
```

---

## Task 4: Performance Optimization

**Files:**
- Modify: `frontend-next/next.config.ts`
- Create: `frontend-next/lib/performance.ts`

### Steps

- [ ] **Step 4.1: Optimize images with next/image**

Ensure all images use Next.js Image component:
```typescript
import Image from 'next/image';

// Replace <img> with <Image>
<Image
  src="/logo.png"
  alt="Logo"
  width={150}
  height={40}
  priority // for above-the-fold images
/>
```

- [ ] **Step 4.2: Optimize fonts with next/font**

Update `frontend-next/app/layout.tsx`:
```typescript
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
```

- [ ] **Step 4.3: Add performance monitoring**

Create `frontend-next/lib/performance.ts`:
```typescript
import { useEffect } from 'react';

export function useWebVitals() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Report Web Vitals
    import('web-vitals').then(({ onCLS, onFID, onFCP, onLCP, onTTFB }) => {
      onCLS(console.log);
      onFID(console.log);
      onFCP(console.log);
      onLCP(console.log);
      onTTFB(console.log);
    });
  }, []);
}

// Add to app/layout.tsx or a client component
```

- [ ] **Step 4.4: Configure caching headers**

Update `frontend-next/next.config.ts`:
```typescript
const nextConfig = {
  // ... existing config
  async headers() {
    return [
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/:path*.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, stale-while-revalidate=86400',
          },
        ],
      },
    ];
  },
};
```

- [ ] **Step 4.5: Commit**

```bash
git add frontend-next/next.config.ts frontend-next/lib/performance.ts frontend-next/app/layout.tsx
git commit -m "perf(polish): add performance optimizations and web vitals"
```

---

## Task 5: Structured Logging

**Files:**
- Create: `frontend-next/lib/logger.ts`

### Steps

- [ ] **Step 5.1: Create structured logger**

Create `frontend-next/lib/logger.ts`:
```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  userId?: string;
  requestId?: string;
  action?: string;
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private isDev = process.env.NODE_ENV === 'development';

  private formatLog(entry: LogEntry): string {
    if (this.isDev) {
      // Pretty print for development
      const { timestamp, level, message, context, error } = entry;
      let output = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
      if (context) output += `\n  Context: ${JSON.stringify(context)}`;
      if (error) output += `\n  Error: ${error.name}: ${error.message}`;
      return output;
    }
    // JSON for production (easier to parse in log aggregators)
    return JSON.stringify(entry);
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    const formatted = this.formatLog(entry);

    switch (level) {
      case 'debug':
        if (this.isDev) console.debug(formatted);
        break;
      case 'info':
        console.info(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'error':
        console.error(formatted);
        break;
    }
  }

  debug(message: string, context?: LogContext) {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error, context?: LogContext) {
    this.log('error', message, context, error);
  }
}

export const logger = new Logger();

// Usage examples:
// logger.info('User signed in', { userId: 'abc123', action: 'signin' });
// logger.error('Payment failed', error, { userId: 'abc123', amount: 1500 });
```

- [ ] **Step 5.2: Add logging to critical paths**

Update API routes to use structured logging:
```typescript
import { logger } from '@/lib/logger';

// In API handlers:
logger.info('Transcription started', {
  userId: session.user.id,
  action: 'transcribe_start',
  fileSize: file.size,
});

// On errors:
logger.error('Transcription failed', error, {
  userId: session.user.id,
  action: 'transcribe_error',
});
```

- [ ] **Step 5.3: Commit**

```bash
git add frontend-next/lib/logger.ts
git commit -m "feat(polish): add structured logging for observability"
```

---

## Task 6: End-to-End Tests with Playwright

**Files:**
- Create: `frontend-next/e2e/auth.spec.ts`
- Create: `frontend-next/e2e/transcription.spec.ts`
- Create: `frontend-next/e2e/dashboard.spec.ts`
- Create: `frontend-next/playwright.config.ts`

### Steps

- [ ] **Step 6.1: Install Playwright**

```bash
cd frontend-next && npm install -D @playwright/test
npx playwright install
```

- [ ] **Step 6.2: Create Playwright config**

Create `frontend-next/playwright.config.ts`:
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

- [ ] **Step 6.3: Create auth E2E tests**

Create `frontend-next/e2e/auth.spec.ts`:
```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should display sign in page', async ({ page }) => {
    await page.goto('/auth/signin');
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/auth/signin');
    await page.fill('input[name="email"]', 'invalid@test.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    await expect(page.getByText(/invalid/i)).toBeVisible();
  });

  test('should redirect unauthenticated users from dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  test('should allow sign up with email', async ({ page }) => {
    await page.goto('/auth/signup');
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', `test${Date.now()}@test.com`);
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    // Should redirect to verification or dashboard
    await expect(page.url()).not.toContain('/signup');
  });
});
```

- [ ] **Step 6.4: Create transcription E2E tests**

Create `frontend-next/e2e/transcription.spec.ts`:
```typescript
import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Transcription', () => {
  test('should display transcription page', async ({ page }) => {
    await page.goto('/transcribe');
    await expect(page.getByRole('heading', { name: /transcribe/i })).toBeVisible();
  });

  test('should show record button', async ({ page }) => {
    await page.goto('/transcribe');
    await expect(page.getByRole('button', { name: /record/i })).toBeVisible();
  });

  test('should allow file upload', async ({ page }) => {
    await page.goto('/transcribe');

    // Create a test audio file or use a fixture
    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.isVisible()) {
      // Note: You'd need a test audio file
      // await fileInput.setInputFiles(path.join(__dirname, 'fixtures', 'test.mp3'));
    }
  });

  test('should show language selector', async ({ page }) => {
    await page.goto('/transcribe');
    await expect(page.getByRole('combobox')).toBeVisible();
  });
});
```

- [ ] **Step 6.5: Create dashboard E2E tests**

Create `frontend-next/e2e/dashboard.spec.ts`:
```typescript
import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  // These tests require authentication
  test.use({
    storageState: 'e2e/.auth/user.json', // Pre-authenticated state
  });

  test.beforeAll(async ({ browser }) => {
    // Setup: Create authenticated session
    // This would login and save session state
  });

  test('should display usage stats', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByText(/transcriptions/i)).toBeVisible();
  });

  test('should display history list', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('list')).toBeVisible();
  });

  test('should navigate to settings', async ({ page }) => {
    await page.goto('/dashboard');
    await page.click('text=Settings');
    await expect(page).toHaveURL(/\/dashboard\/settings/);
  });
});
```

- [ ] **Step 6.6: Add test scripts to package.json**

Add to `frontend-next/package.json`:
```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed"
  }
}
```

- [ ] **Step 6.7: Run E2E tests**

```bash
npm run test:e2e
```

- [ ] **Step 6.8: Commit**

```bash
git add frontend-next/e2e/ frontend-next/playwright.config.ts frontend-next/package.json
git commit -m "test(polish): add Playwright E2E test suite"
```

---

## Task 7: SEO and Meta Tags

**Files:**
- Modify: `frontend-next/app/layout.tsx`
- Create: `frontend-next/app/sitemap.ts`
- Create: `frontend-next/app/robots.ts`

### Steps

- [ ] **Step 7.1: Add comprehensive meta tags**

Update `frontend-next/app/layout.tsx`:
```typescript
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'speech-to-text.me - Free Audio Transcription',
    template: '%s | speech-to-text.me',
  },
  description:
    'Free online speech-to-text transcription. Convert audio to text instantly using AI. Supports multiple languages.',
  keywords: [
    'speech to text',
    'audio transcription',
    'voice to text',
    'transcribe audio',
    'free transcription',
  ],
  authors: [{ name: 'speech-to-text.me' }],
  creator: 'speech-to-text.me',
  metadataBase: new URL('https://speech-to-text.me'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://speech-to-text.me',
    title: 'speech-to-text.me - Free Audio Transcription',
    description: 'Convert audio to text instantly using AI.',
    siteName: 'speech-to-text.me',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'speech-to-text.me',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'speech-to-text.me - Free Audio Transcription',
    description: 'Convert audio to text instantly using AI.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
};
```

- [ ] **Step 7.2: Create sitemap**

Create `frontend-next/app/sitemap.ts`:
```typescript
import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://speech-to-text.me';

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/transcribe`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/pdf-to-audio`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];
}
```

- [ ] **Step 7.3: Create robots.txt**

Create `frontend-next/app/robots.ts`:
```typescript
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/dashboard/', '/s/'],
      },
    ],
    sitemap: 'https://speech-to-text.me/sitemap.xml',
  };
}
```

- [ ] **Step 7.4: Commit**

```bash
git add frontend-next/app/layout.tsx frontend-next/app/sitemap.ts frontend-next/app/robots.ts
git commit -m "feat(polish): add SEO meta tags, sitemap, and robots.txt"
```

---

## Task 8: Production Deployment Checklist

**Files:**
- Create: `docs/deployment-checklist.md`

### Steps

- [ ] **Step 8.1: Create deployment checklist document**

Create `docs/deployment-checklist.md`:
```markdown
# Production Deployment Checklist

## Pre-Deployment

### Environment Variables
- [ ] `NEXTAUTH_SECRET` - Strong random secret (32+ chars)
- [ ] `NEXTAUTH_URL` - Production URL (https://speech-to-text.me)
- [ ] `DATABASE_URL` - Production PostgreSQL connection string
- [ ] `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - Production Google OAuth
- [ ] `APPLE_CLIENT_ID` / `APPLE_CLIENT_SECRET` - Production Apple OAuth
- [ ] `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` - Live Stripe keys
- [ ] `STRIPE_WEBHOOK_SECRET` - Production webhook secret
- [ ] `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` - Cloudflare R2
- [ ] `R2_BUCKET_NAME` - Production bucket name

### Database
- [ ] Run `npx prisma migrate deploy` on production database
- [ ] Verify all indexes are created
- [ ] Set up database backups (daily)
- [ ] Configure connection pooling if needed

### Stripe
- [ ] Create production products/prices
- [ ] Update price IDs in environment
- [ ] Register production webhook endpoint
- [ ] Configure Customer Portal branding
- [ ] Enable tax calculation if needed

### DNS & SSL
- [ ] DNS A/CNAME records configured
- [ ] SSL certificate provisioned (Let's Encrypt or Cloudflare)
- [ ] HTTPS redirect enabled
- [ ] HSTS header configured

### External Services
- [ ] Google OAuth - Production redirect URIs configured
- [ ] Apple OAuth - Production redirect URIs configured
- [ ] Cloudflare R2 - CORS rules configured
- [ ] Email service - Production API keys

## Deployment

### Build Verification
- [ ] `npm run build` succeeds without errors
- [ ] `npm run lint` passes
- [ ] `npm run test` passes
- [ ] `npm run test:e2e` passes
- [ ] Docker image builds successfully

### Deploy Steps
1. [ ] Create database backup
2. [ ] Run database migrations
3. [ ] Deploy new container/build
4. [ ] Verify health endpoint responds
5. [ ] Run smoke tests
6. [ ] Monitor error logs for 30 minutes

## Post-Deployment Verification

### Functional Tests
- [ ] Homepage loads correctly
- [ ] Google OAuth sign-in works
- [ ] Transcription with recording works
- [ ] File upload transcription works
- [ ] Dashboard loads for authenticated users
- [ ] History displays correctly
- [ ] Share link creation works
- [ ] Share page displays correctly
- [ ] Stripe checkout redirects correctly
- [ ] Webhook receives events

### Performance Checks
- [ ] Lighthouse score > 90 for homepage
- [ ] Time to First Byte < 200ms
- [ ] Largest Contentful Paint < 2.5s
- [ ] No console errors in browser

### Security Checks
- [ ] CSP headers configured
- [ ] X-Frame-Options set
- [ ] X-Content-Type-Options: nosniff
- [ ] Referrer-Policy configured
- [ ] No sensitive data in error messages

## Rollback Plan

### Automatic Rollback Triggers
- Error rate > 5% for 5 minutes
- Response time p95 > 3s for 5 minutes
- Health check failures for 2 minutes

### Manual Rollback Steps
1. Identify the issue and affected version
2. Revert to previous container/build version
3. If database migration issue:
   - Restore from backup
   - Or run down migration: `npx prisma migrate reset --skip-seed`
4. Verify rollback health
5. Investigate root cause

### Rollback Commands
\`\`\`bash
# Docker rollback
docker service update --image registry/app:previous-tag app

# Kubernetes rollback
kubectl rollout undo deployment/app

# Vercel rollback
vercel rollback <deployment-url>
\`\`\`

## Monitoring

### Key Metrics to Watch
- Request rate and error rate
- Response time (p50, p95, p99)
- Database connection count
- Memory and CPU usage
- Stripe webhook success rate

### Alerts to Configure
- Error rate > 1%
- p95 latency > 2s
- Database connections > 80%
- Memory usage > 85%
- Failed Stripe webhooks
```

- [ ] **Step 8.2: Commit**

```bash
git add docs/deployment-checklist.md
git commit -m "docs(polish): add production deployment checklist"
```

---

## Task 9: Final Code Review and Cleanup

**Files:**
- Various files for cleanup

### Steps

- [ ] **Step 9.1: Remove console.log statements**

Search and remove development console.log statements:
```bash
grep -r "console.log" frontend-next/app frontend-next/components frontend-next/lib --include="*.ts" --include="*.tsx"
```

Keep only intentional logging via the logger utility.

- [ ] **Step 9.2: Remove unused imports**

Run ESLint with fix:
```bash
cd frontend-next && npm run lint -- --fix
```

- [ ] **Step 9.3: Remove TODO comments or convert to issues**

```bash
grep -r "TODO\|FIXME\|HACK" frontend-next/app frontend-next/components frontend-next/lib --include="*.ts" --include="*.tsx"
```

Document any remaining TODOs as GitHub issues.

- [ ] **Step 9.4: Verify TypeScript strict mode**

Ensure `tsconfig.json` has strict mode:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

Run type check:
```bash
npm run type-check
```

- [ ] **Step 9.5: Run final build**

```bash
cd frontend-next && npm run build
```

Ensure no warnings or errors.

- [ ] **Step 9.6: Commit cleanup**

```bash
git add -A
git commit -m "chore(polish): final code cleanup and lint fixes"
```

---

## Task 10: Documentation Updates

**Files:**
- Modify: `README.md`
- Create: `docs/architecture.md`

### Steps

- [ ] **Step 10.1: Update README**

Update the main README with:
- Updated feature list
- Environment variable documentation
- Development setup instructions
- Production deployment link

- [ ] **Step 10.2: Create architecture overview**

Create `docs/architecture.md`:
```markdown
# Architecture Overview

## System Components

### Frontend (Next.js)
- App Router with React Server Components
- NextAuth.js for authentication
- Tailwind CSS for styling
- next-intl for internationalization

### Backend Integration
- API routes in Next.js for auth and billing
- Proxy routes to NestJS backend for transcription
- Prisma ORM for database access

### External Services
- **PostgreSQL** - User data, transcriptions, billing
- **Cloudflare R2** - Audio file storage
- **Stripe** - Subscription billing
- **Google/Apple OAuth** - Social authentication
- **OpenAI Whisper** - Speech-to-text (via NestJS)
- **OpenAI TTS** - Text-to-speech (via NestJS)

## Data Flow

### Transcription Flow
1. User uploads audio or records in browser
2. Frontend sends to `/api/proxy/transcribe`
3. Proxy forwards to NestJS backend
4. Backend stores audio in R2, calls Whisper API
5. Result saved to database, returned to frontend

### Share Flow
1. User creates share link from dashboard
2. System generates unique token, optional password hash
3. Visitor accesses `/s/{token}`
4. If password protected, verify and set JWT cookie
5. Fetch and display transcription content

## Security Model

- JWT sessions stored in httpOnly cookies
- Rate limiting on auth and API endpoints
- Presigned URLs for R2 storage access
- Tier enforcement on backend (not client)
- Webhook signature verification for Stripe
```

- [ ] **Step 10.3: Commit documentation**

```bash
git add README.md docs/architecture.md
git commit -m "docs(polish): update README and add architecture documentation"
```

---

## Verification Checklist

### Error Handling
- [ ] Error boundaries catch and display errors gracefully
- [ ] API errors return appropriate status codes
- [ ] User-friendly error messages displayed

### Loading States
- [ ] All async operations show loading indicators
- [ ] Skeleton loaders for dashboard and lists
- [ ] No content flash or layout shift

### Accessibility
- [ ] All form inputs have labels
- [ ] Icon buttons have aria-labels
- [ ] Color contrast meets WCAG AA
- [ ] Skip link for keyboard navigation
- [ ] Focus indicators visible

### Performance
- [ ] Lighthouse score > 90
- [ ] Images optimized with next/image
- [ ] Fonts optimized with next/font
- [ ] No unnecessary re-renders

### Testing
- [ ] Unit tests pass (Vitest)
- [ ] E2E tests pass (Playwright)
- [ ] Manual smoke test complete

### Production Readiness
- [ ] All console.logs removed
- [ ] No TypeScript errors
- [ ] Build succeeds
- [ ] Deployment checklist reviewed

---

## Phase Completion Criteria

This phase is complete when:
1. All error boundaries are in place
2. Loading states exist for all async operations
3. Accessibility audit passes (WCAG AA)
4. E2E test suite covers critical paths
5. Production deployment checklist is complete
6. Documentation is updated
7. Final build succeeds with no errors

After completing this phase, the application is ready for production deployment.
