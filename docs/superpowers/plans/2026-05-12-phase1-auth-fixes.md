# Phase 1 Fixes: Auth Foundation Hardening

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix critical gaps in Phase 1 authentication: add password reset, rate limiting, account enumeration protection, and test infrastructure.

**Architecture:** Extends existing NextAuth.js v5 setup with security hardening and missing user flows.

**Tech Stack:** Next.js 16, NextAuth.js v5, Prisma, Resend, Vitest, Playwright

**Prerequisites:** Phase 1 basic implementation complete (login, signup, verify, dashboard)

---

## Task 1: Add Password Reset Flow

**Files:**
- Create: `frontend-next/app/(auth)/forgot-password/page.tsx`
- Create: `frontend-next/app/(auth)/reset-password/page.tsx`
- Create: `frontend-next/components/auth/forgot-password-form.tsx`
- Create: `frontend-next/components/auth/reset-password-form.tsx`
- Create: `frontend-next/app/api/auth/forgot-password/route.ts`
- Create: `frontend-next/app/api/auth/reset-password/route.ts`
- Modify: `frontend-next/components/auth/login-form.tsx`

- [ ] **Step 1: Create forgot password API route**

```typescript
// frontend-next/app/api/auth/forgot-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendPasswordResetEmail, generateToken } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    // Always return success to prevent account enumeration
    const successResponse = NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a reset link has been sent.'
    });

    if (!email) {
      return successResponse;
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Don't reveal if user exists - return same response
    if (!user || !user.passwordHash) {
      return successResponse;
    }

    // Delete any existing reset tokens for this user
    await prisma.verificationToken.deleteMany({
      where: { identifier: `reset:${normalizedEmail}` },
    });

    const token = generateToken();
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.verificationToken.create({
      data: {
        identifier: `reset:${normalizedEmail}`,
        token,
        expires,
      },
    });

    await sendPasswordResetEmail(normalizedEmail, token);

    return successResponse;
  } catch (error) {
    console.error('Password reset request error:', error);
    // Return same response even on error to prevent enumeration
    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a reset link has been sent.'
    });
  }
}
```

- [ ] **Step 2: Create reset password API route**

```typescript
// frontend-next/app/api/auth/reset-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, validatePassword } from '@/lib/password';

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and password are required' },
        { status: 400 }
      );
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.error },
        { status: 400 }
      );
    }

    // Find the reset token
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken || !verificationToken.identifier.startsWith('reset:')) {
      return NextResponse.json(
        { error: 'Invalid or expired reset link' },
        { status: 400 }
      );
    }

    if (verificationToken.expires < new Date()) {
      await prisma.verificationToken.delete({ where: { token } });
      return NextResponse.json(
        { error: 'Reset link has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    const email = verificationToken.identifier.replace('reset:', '');

    // Hash new password and update user
    const passwordHash = await hashPassword(password);

    await prisma.user.update({
      where: { email },
      data: { passwordHash },
    });

    // Delete the used token
    await prisma.verificationToken.delete({ where: { token } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: Create forgot password form component**

```typescript
// frontend-next/components/auth/forgot-password-form.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function ForgotPasswordForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setSubmitted(true);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center space-y-4">
        <div className="text-5xl">📧</div>
        <p className="text-sm text-slate-600">
          If an account exists with <strong>{email}</strong>, we've sent a password reset link.
          Check your inbox and spam folder.
        </p>
        <p className="text-sm text-slate-500">
          The link expires in 1 hour.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
          Email address
        </label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Sending...' : 'Send reset link'}
      </Button>
    </form>
  );
}
```

- [ ] **Step 4: Create forgot password page**

```typescript
// frontend-next/app/(auth)/forgot-password/page.tsx
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';

export default function ForgotPasswordPage() {
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Reset your password</CardTitle>
        <CardDescription>
          Enter your email and we'll send you a reset link
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <ForgotPasswordForm />

        <p className="text-center text-sm text-slate-600">
          Remember your password?{' '}
          <Link href="/login" className="font-medium text-[#3B82F6] hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 5: Create reset password form component**

```typescript
// frontend-next/components/auth/reset-password-form.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ResetPasswordFormProps {
  token: string;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to reset password');
        return;
      }

      router.push('/login?reset=success');
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
          New password
        </label>
        <Input
          id="password"
          type="password"
          placeholder="Min 8 chars, 1 letter, 1 number"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          required
        />
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-1">
          Confirm new password
        </label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="Repeat password"
          value={formData.confirmPassword}
          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
          required
        />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Resetting...' : 'Reset password'}
      </Button>
    </form>
  );
}
```

- [ ] **Step 6: Create reset password page**

```typescript
// frontend-next/app/(auth)/reset-password/page.tsx
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = searchParams.token;

  if (!token) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle>Invalid Reset Link</CardTitle>
          <CardDescription>
            This password reset link is invalid or has expired.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Link href="/forgot-password" className="text-[#3B82F6] hover:underline">
            Request a new reset link
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Set new password</CardTitle>
        <CardDescription>
          Enter your new password below
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResetPasswordForm token={token} />
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 7: Add forgot password link to login form**

In `frontend-next/components/auth/login-form.tsx`, add after the password input:

```typescript
<div className="flex justify-end">
  <Link
    href="/forgot-password"
    className="text-sm text-[#3B82F6] hover:underline"
  >
    Forgot password?
  </Link>
</div>
```

- [ ] **Step 8: Verify password reset flow works**

```bash
# Test the flow manually:
# 1. Go to /forgot-password
# 2. Enter a valid email
# 3. Check email for reset link
# 4. Click link, set new password
# 5. Login with new password
```

---

## Task 2: Add Rate Limiting

**Files:**
- Create: `frontend-next/lib/rate-limit.ts`
- Modify: `frontend-next/app/api/auth/signup/route.ts`
- Modify: `frontend-next/app/api/auth/forgot-password/route.ts`

- [ ] **Step 1: Create rate limiting utility**

```typescript
// frontend-next/lib/rate-limit.ts
import { headers } from 'next/headers';

interface RateLimitRecord {
  count: number;
  firstRequest: number;
}

// In-memory store (use Redis in production for multi-instance)
const rateLimitStore = new Map<string, RateLimitRecord>();

interface RateLimitConfig {
  windowMs: number;  // Time window in milliseconds
  maxAttempts: number;  // Max attempts in window
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  login: { windowMs: 15 * 60 * 1000, maxAttempts: 5 },      // 5 per 15 min
  signup: { windowMs: 60 * 60 * 1000, maxAttempts: 3 },     // 3 per hour
  'password-reset': { windowMs: 60 * 60 * 1000, maxAttempts: 3 }, // 3 per hour
};

export function getClientIp(): string {
  const headersList = headers();
  const forwarded = headersList.get('x-forwarded-for');
  const realIp = headersList.get('x-real-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (realIp) {
    return realIp;
  }
  return 'unknown';
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

export function checkRateLimit(action: keyof typeof RATE_LIMITS, identifier?: string): RateLimitResult {
  const config = RATE_LIMITS[action];
  if (!config) {
    return { allowed: true, remaining: 999, resetAt: new Date() };
  }

  const ip = getClientIp();
  const key = `${action}:${identifier || ip}`;
  const now = Date.now();

  const record = rateLimitStore.get(key);

  // No record or window expired - allow and start new window
  if (!record || now - record.firstRequest > config.windowMs) {
    rateLimitStore.set(key, { count: 1, firstRequest: now });
    return {
      allowed: true,
      remaining: config.maxAttempts - 1,
      resetAt: new Date(now + config.windowMs),
    };
  }

  // Within window - check count
  if (record.count >= config.maxAttempts) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(record.firstRequest + config.windowMs),
    };
  }

  // Increment and allow
  record.count++;
  return {
    allowed: true,
    remaining: config.maxAttempts - record.count,
    resetAt: new Date(record.firstRequest + config.windowMs),
  };
}

// Cleanup old entries periodically (call from a cron or on each request)
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  const maxAge = 2 * 60 * 60 * 1000; // 2 hours

  for (const [key, record] of rateLimitStore.entries()) {
    if (now - record.firstRequest > maxAge) {
      rateLimitStore.delete(key);
    }
  }
}
```

- [ ] **Step 2: Add rate limiting to signup route**

Update `frontend-next/app/api/auth/signup/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, validatePassword } from '@/lib/password';
import { sendVerificationEmail, generateToken } from '@/lib/email';
import { checkRateLimit, cleanupRateLimitStore } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  // Cleanup old rate limit entries
  cleanupRateLimitStore();

  // Check rate limit
  const rateLimit = checkRateLimit('signup');
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: 'Too many signup attempts. Please try again later.',
        retryAfter: rateLimit.resetAt.toISOString(),
      },
      {
        status: 429,
        headers: {
          'Retry-After': Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000).toString(),
        },
      }
    );
  }

  try {
    const { name, email, password } = await request.json();

    // ... rest of existing signup logic
```

- [ ] **Step 3: Add rate limiting to forgot password route**

Update `frontend-next/app/api/auth/forgot-password/route.ts` (add at the start of POST):

```typescript
import { checkRateLimit, cleanupRateLimitStore } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  cleanupRateLimitStore();

  const rateLimit = checkRateLimit('password-reset');
  if (!rateLimit.allowed) {
    // Still return success message to prevent enumeration
    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a reset link has been sent.'
    });
  }

  // ... rest of existing logic
```

---

## Task 3: Fix Account Enumeration Vulnerability

**Files:**
- Modify: `frontend-next/app/api/auth/signup/route.ts`

- [ ] **Step 1: Update signup to prevent account enumeration**

Replace the existing user check in `frontend-next/app/api/auth/signup/route.ts`:

```typescript
// Check if user exists
const existingUser = await prisma.user.findUnique({
  where: { email: normalizedEmail },
});

if (existingUser) {
  // If user exists but email not verified, resend verification
  if (!existingUser.emailVerified) {
    // Delete old tokens
    await prisma.verificationToken.deleteMany({
      where: { identifier: normalizedEmail },
    });

    const token = generateToken();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.verificationToken.create({
      data: { identifier: normalizedEmail, token, expires },
    });

    await sendVerificationEmail(normalizedEmail, token);
  }

  // Return same response as success to prevent enumeration
  // User gets email if unverified, nothing if already verified
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Add email normalization throughout**

Ensure all email comparisons use normalized (lowercase, trimmed) emails:

```typescript
const normalizedEmail = email.toLowerCase().trim();
```

---

## Task 4: Add Test Infrastructure

**Files:**
- Create: `frontend-next/vitest.config.ts`
- Create: `frontend-next/vitest.setup.ts`
- Create: `frontend-next/__tests__/lib/password.test.ts`
- Create: `frontend-next/__tests__/lib/rate-limit.test.ts`
- Create: `frontend-next/playwright.config.ts`
- Create: `frontend-next/e2e/auth.spec.ts`
- Modify: `frontend-next/package.json`

- [ ] **Step 1: Install test dependencies**

```bash
cd frontend-next && pnpm add -D vitest @testing-library/react @testing-library/jest-dom @vitejs/plugin-react jsdom @playwright/test
```

- [ ] **Step 2: Create Vitest config**

```typescript
// frontend-next/vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/__tests__/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['lib/**/*.ts', 'components/**/*.tsx'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
```

- [ ] **Step 3: Create Vitest setup file**

```typescript
// frontend-next/vitest.setup.ts
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock next/headers for server components
vi.mock('next/headers', () => ({
  headers: () => new Map([['x-forwarded-for', '127.0.0.1']]),
  cookies: () => ({
    get: vi.fn(),
    set: vi.fn(),
  }),
}));
```

- [ ] **Step 4: Create password utility tests**

```typescript
// frontend-next/__tests__/lib/password.test.ts
import { describe, it, expect } from 'vitest';
import { validatePassword, hashPassword, verifyPassword } from '@/lib/password';

describe('validatePassword', () => {
  it('rejects passwords shorter than 8 characters', () => {
    expect(validatePassword('abc123').valid).toBe(false);
    expect(validatePassword('abc123').error).toContain('8 characters');
  });

  it('rejects passwords without letters', () => {
    expect(validatePassword('12345678').valid).toBe(false);
    expect(validatePassword('12345678').error).toContain('letter');
  });

  it('rejects passwords without numbers', () => {
    expect(validatePassword('abcdefgh').valid).toBe(false);
    expect(validatePassword('abcdefgh').error).toContain('number');
  });

  it('accepts valid passwords', () => {
    expect(validatePassword('password1').valid).toBe(true);
    expect(validatePassword('MyP@ssw0rd').valid).toBe(true);
    expect(validatePassword('12345678a').valid).toBe(true);
  });
});

describe('hashPassword and verifyPassword', () => {
  it('correctly hashes and verifies passwords', async () => {
    const password = 'testPassword123';
    const hash = await hashPassword(password);

    expect(hash).not.toBe(password);
    expect(hash.length).toBeGreaterThan(50);
    expect(await verifyPassword(password, hash)).toBe(true);
  });

  it('rejects incorrect passwords', async () => {
    const hash = await hashPassword('correctPassword1');
    expect(await verifyPassword('wrongPassword1', hash)).toBe(false);
  });

  it('produces different hashes for same password', async () => {
    const password = 'samePassword1';
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);

    expect(hash1).not.toBe(hash2); // bcrypt uses random salt
    expect(await verifyPassword(password, hash1)).toBe(true);
    expect(await verifyPassword(password, hash2)).toBe(true);
  });
});
```

- [ ] **Step 5: Create rate limit tests**

```typescript
// frontend-next/__tests__/lib/rate-limit.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkRateLimit } from '@/lib/rate-limit';

describe('checkRateLimit', () => {
  beforeEach(() => {
    // Reset rate limit store between tests
    vi.resetModules();
  });

  it('allows requests within limit', async () => {
    const { checkRateLimit } = await import('@/lib/rate-limit');

    const result1 = checkRateLimit('signup', 'test-user-1');
    expect(result1.allowed).toBe(true);
    expect(result1.remaining).toBe(2); // 3 max - 1 used

    const result2 = checkRateLimit('signup', 'test-user-1');
    expect(result2.allowed).toBe(true);
    expect(result2.remaining).toBe(1);
  });

  it('blocks requests over limit', async () => {
    const { checkRateLimit } = await import('@/lib/rate-limit');

    // Use up all 3 signup attempts
    checkRateLimit('signup', 'test-user-2');
    checkRateLimit('signup', 'test-user-2');
    checkRateLimit('signup', 'test-user-2');

    const blocked = checkRateLimit('signup', 'test-user-2');
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it('tracks different identifiers separately', async () => {
    const { checkRateLimit } = await import('@/lib/rate-limit');

    // User A uses their limit
    checkRateLimit('signup', 'user-a');
    checkRateLimit('signup', 'user-a');
    checkRateLimit('signup', 'user-a');

    // User B should still have their full limit
    const resultB = checkRateLimit('signup', 'user-b');
    expect(resultB.allowed).toBe(true);
    expect(resultB.remaining).toBe(2);
  });
});
```

- [ ] **Step 6: Create Playwright config**

```typescript
// frontend-next/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
  },
});
```

- [ ] **Step 7: Create E2E auth tests**

```typescript
// frontend-next/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('login page loads', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();
  });

  test('signup page loads', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByRole('heading', { name: /create an account/i })).toBeVisible();
  });

  test('protected routes redirect to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*login/);
  });

  test('forgot password page loads', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.getByRole('heading', { name: /reset your password/i })).toBeVisible();
  });

  test('can navigate from login to forgot password', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: /forgot password/i }).click();
    await expect(page).toHaveURL('/forgot-password');
  });

  test('can navigate from login to signup', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: /sign up/i }).click();
    await expect(page).toHaveURL('/signup');
  });
});
```

- [ ] **Step 8: Update package.json scripts**

Add to `frontend-next/package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

- [ ] **Step 9: Run tests to verify**

```bash
cd frontend-next
pnpm test
pnpm test:e2e
```

---

## Validation Checkpoint

After completing all tasks, verify:

- [ ] Can request password reset via /forgot-password
- [ ] Password reset email is sent (check Resend dashboard or email)
- [ ] Reset link works and allows setting new password
- [ ] Can login with new password after reset
- [ ] Rate limiting blocks excessive signup attempts (test with curl)
- [ ] Rate limiting blocks excessive password reset attempts
- [ ] Signup returns same response whether email exists or not
- [ ] Unit tests pass: `pnpm test`
- [ ] E2E tests pass: `pnpm test:e2e`

---

## Next Phase

After validation passes, proceed to **Phase 2A: Apple OAuth**
